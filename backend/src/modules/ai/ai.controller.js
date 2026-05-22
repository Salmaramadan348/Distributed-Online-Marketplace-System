import { productModel } from "../../../db/models/product.model.js";
import { transactionModel } from "../../../db/models/transaction.model.js";
import { userModel } from "../../../db/models/user.model.js"; 
import { servicesData } from "./services.data.js";

/**
 * ---------------------------------------------------------
 * AGENT CONFIGURATION
 * ---------------------------------------------------------
 * Defining the 'Brain' (LLM) and its connection parameters.
 */
const HF_API_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_MODEL_ID = process.env.HF_MODEL_ID || "meta-llama/Meta-Llama-3-8B-Instruct:fastest";
/**
 * AGENT CAPABILITIES (Tools)
 * These act as the 'hands' of the agent, allowing it to interact 
 * with the external world (Database).
 */
const TOOLS = {
  GET_PRODUCTS: "get_available_products",
  GET_SERVICES: "get_services_info",
  GET_MY_STATS: "get_personal_stats",
};

/**
 * ACTION EXECUTION LAYER (The "Act" Phase)
 * It ensures data integrity and security (filtering by userId).
 */
const executeTool = async (toolName, userId) => {
  switch (toolName) {
    case TOOLS.GET_PRODUCTS: {
      const products = await productModel.find({}).sort({ createdAt: -1 }).lean();

      if (products.length === 0) {
        return "No products are currently available in the marketplace.";
      }

      return products
        .map((product) => `- ${product.title}: $${product.price} (Stock: ${product.quantity}, Status: ${product.status})`)
        .join("\n");
    }

    case TOOLS.GET_SERVICES:
      return servicesData.join("\n");

    case TOOLS.GET_MY_STATS: {
      const user = await userModel.findById(userId).lean();
      if (!user) return "User profile not found.";

      const myTransactions = await transactionModel.find({
        $or: [{ buyer: userId }, { seller: userId }]
      }).sort({ createdAt: -1 }).lean();

      const purchases = myTransactions.filter((transaction) => transaction.buyer?.toString() === userId?.toString());
      const sales = myTransactions.filter((transaction) => transaction.seller?.toString() === userId?.toString());
      const totalSpent = purchases.reduce((sum, transaction) => sum + (transaction.price || 0), 0);
      const totalEarned = sales.reduce((sum, transaction) => sum + (transaction.price || 0), 0);

      const recentActivity = myTransactions.slice(0, 10).map((transaction) => ({
        product: transaction.product,
        price: transaction.price || 0,
        date: transaction.createdAt
      }));

      return [
        "Your Account Summary:",
        `- ID: ${user._id}`,
        `- Username: ${user.userName}`,
        `- Email: ${user.email}`,
        `- Role: ${user.role}`,
        `- Confirmed: ${user.isConfirmed ? "Yes" : "No"}`,
        `- Current Balance: ${user.balance || 0} $`,
        `- Purchased Items: ${Array.isArray(user.purchasedItems) ? user.purchasedItems.length : 0}`,
        `- Sold Items: ${Array.isArray(user.soldItems) ? user.soldItems.length : 0}`,
        `- Total Activity Records: ${myTransactions.length}`,
        `- Purchases: ${purchases.length}`,
        `- Sales: ${sales.length}`,
        `- Total Spent: ${totalSpent.toFixed(2)} $`,
        `- Total Earned: ${totalEarned.toFixed(2)} $`,
        "",
        "Recent Activity:",
        ...recentActivity.map((item) => `- [${item.date}] Product:${item.product} Price:${item.price}`)
      ].join("\n");
    }

    default:
      return "Tool execution failed: Unknown capability.";
  }
};

const denyAdminScope = (question) => {
  const pattern = /(total revenue|revenue so far|all users|which users are admins|admin list|market summary|marketplace summary|system summary|business report|transaction volume|full marketplace report|inventory status|all transactions|all products including sold)/i;
  return pattern.test(question || "");
};

/**
 * COMMUNICATION LAYER
 * Standardized wrapper to talk to the LLM.
 */
const callLLM = async (messages) => {
  if (!process.env.HF_API_KEY) throw new Error("HF_API_KEY is missing.");

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: HF_MODEL_ID,
      messages,
      max_tokens: 400,
      temperature: 0.2,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Service Error: ${response.status} - ${errorText}`);
  }

  const json = await response.json();
  return json.choices[0].message.content.trim();
};

// --- API CONTROLLERS ---

export const getServices = (req, res) => res.json({ services: servicesData });

/**
 * ---------------------------------------------------------
 * PRIMARY AGENT CONTROLLER (The Orchestrator)
 * Implements the "Reason -> Act -> Observe" Loop.
 * ---------------------------------------------------------
 */
export const askAi = async (req, res) => {
  try {
    const { question } = req.body;
    const userId = req.user?._id; 

    if (!question) return res.status(400).json({ error: "Question is required." });

    if (denyAdminScope(question)) {
      return res.json({
        answer: "I can help with your own account, products, checkout, and services. I can't provide marketplace-wide admin reports or other users' data."
      });
    }

    /**
     * STAGE 1: SYSTEM INSTRUCTION (The Ruleset)
     * Defines the Agent's identity, boundaries, and logic protocols.
     */
    const systemInstruction = `
      We are a user-facing marketplace assistant. You can only discuss the signed-in user's own account state and public product information.
      You are not allowed to reveal marketplace-wide reports, other users' data, global revenue, admin lists, or private business metrics.

      You have access to these specific tools:
      - ${TOOLS.GET_PRODUCTS}: Use when users ask about products, pricing, stock, or catalog browsing.
      - ${TOOLS.GET_SERVICES}: Use for general info about website capabilities, user roles, and services.
      - ${TOOLS.GET_MY_STATS}: Use when users ask about their own account, wallet, purchases, sales, or transaction history.

      Guidelines:
      1. If you need data from a tool to answer, reply ONLY with: "CALL_TOOL: tool_name".
      2. If you have the data, provide a concise, accurate response in English.
      3. Never invent numbers, products, users, or transactions.
      4. If the user asks for admin-only or marketplace-wide data, politely refuse and offer help with their own account or public products.
    `.trim();

    let messages = [
      { role: "system", content: systemInstruction },
      { role: "user", content: question }
    ];

    /**
     * STAGE 2: THE REASONING PASS
     * The Agent analyzes the user's intent and decides if it needs a Tool.
     */
    let aiResponse = await callLLM(messages);

    /**
     * STAGE 3: THE ACTION & OBSERVATION PASS
     * If the Agent triggered a tool, we execute it and feed the 'Observation' back.
     */
    if (aiResponse.includes("CALL_TOOL:")) {
      const toolMatch = aiResponse.match(/CALL_TOOL:\s*(\w+)/);
      const toolName = toolMatch ? toolMatch[1] : null;
      
      if (toolName && Object.values(TOOLS).includes(toolName)) {
        // Execute Action
        const observation = await executeTool(toolName, userId);

        // Feed Observation back to the Agent for final reasoning
        messages.push({ role: "assistant", content: aiResponse });
        messages.push({ 
          role: "user", 
          content: `Data Observation:\n${observation}\n\nBased on this data, please answer my original question naturally. Do not list all the data unless I explicitly asked for everything.` 
        });

        // Generate final response based on observation
        aiResponse = await callLLM(messages);
      }
    }

    /**
     * STAGE 4: RESPONSE CLEANUP
     * Ensures the internal "Agentic" technical jargon is hidden from the end-user.
     */
    const cleanAnswer = aiResponse
      .replace(/^CALL_TOOL:.*$/gm, "")
      .replace(/^Data Observation:.*$/gm, "")
      .trim();

    res.json({ answer: cleanAnswer });

  } catch (error) {
    console.error("Agent Error:", error);
    res.status(500).json({ error: "Internal server error during AI processing." });
  }
};