import mongoose from 'mongoose';

const uri = "mongodb+srv://salmaramadan348_db_user:H3ez4FNjg9om1oWh@cluster0.kx5l9yp.mongodb.net";
const connections = {
  userDB: mongoose.createConnection(`${uri}/userDB`),
  productDB: mongoose.createConnection(`${uri}/productDB`),
  paymentDB: mongoose.createConnection(`${uri}/paymentDB`),
  inventoryDB: mongoose.createConnection(`${uri}/inventoryDB`),
  chatDB: mongoose.createConnection(`${uri}/chatDB`),
  reportDB: mongoose.createConnection(`${uri}/reportDB`),
};

export const connectDatabases = async () => {
  try {
    await connections.userDB.asPromise();
    console.log('✅ userDB connected');

    await connections.productDB.asPromise();
    console.log('✅ productDB connected');

    await connections.paymentDB.asPromise();
    console.log('✅ paymentDB connected');

    await connections.inventoryDB.asPromise();
    console.log('✅ inventoryDB connected');

    await connections.chatDB.asPromise();
    console.log('✅ chatDB connected');

    await connections.reportDB.asPromise();
    console.log('✅ reportDB connected');

    console.log('\n🟢 All 6 distributed databases connected!');
  } catch (err) {
    console.error('❌ DB connection error:', err.message);
    process.exit(1);
  }
};

export { connections };