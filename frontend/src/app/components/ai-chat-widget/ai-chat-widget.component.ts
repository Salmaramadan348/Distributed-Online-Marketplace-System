import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiAssistantService } from '../../Services/ai-assistant.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat-widget.component.html',
  styleUrl: './ai-chat-widget.component.css'
})
export class AiChatWidgetComponent {
  isOpen = false;
  isLoading = false;
  messageText = '';

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      text: 'Hi! Ask me about products, checkout, or marketplace roles.'
    }
  ];

  suggestedQuestions: string[] = [
    'What products are available?',
    'What is the cheapest product?',
    'What are the details of this product?',
    'How do I checkout?',
    'How do I sell an item on this website?',
    'How do I buy an item on this website?'
  ];

  constructor(private aiService: AiAssistantService) {}

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  closeChat(): void {
    this.isOpen = false;
  }

  sendMessage(text?: string): void {
    const content = (text ?? this.messageText).trim();
    if (!content || this.isLoading) {
      return;
    }

    this.messages.push({ role: 'user', text: content });
    this.messageText = '';
    this.isLoading = true;

    this.aiService.ask(content).subscribe({
      next: (response) => {
        const answer = response?.answer || response?.error || 'No answer returned.';
        this.messages.push({ role: 'assistant', text: answer });
        this.isLoading = false;
      },
      error: () => {
        this.messages.push({ role: 'assistant', text: 'Sorry, I could not reach the assistant.' });
        this.isLoading = false;
      }
    });
  }

  useSuggestion(question: string): void {
    this.sendMessage(question);
  }

  trackByIndex(index: number): number {
    return index;
  }
}
