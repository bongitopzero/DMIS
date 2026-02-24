import mongoose from "mongoose";
import dotenv from "dotenv";
import Disaster from "../models/Disaster.js";
import BudgetAllocation from "../models/BudgetAllocation.js";
import Expense from "../models/Expense.js";

dotenv.config();

async function seedFinancialData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Get first disaster to use as reference
    let disaster = await Disaster.findOne();
    
    if (!disaster) {
      console.log("❌ No disasters found. Run seedDisasters.js first.");
      process.exit(1);
    }

    console.log(`📌 Using disaster: ${disaster.district}`);

    // Note: Skip clearing data to avoid triggering deletion hooks
    // Data will be overwritten on duplicate keys if needed
    console.log("📝 Creating budget and expense data...");

    // Create test budgets
    const budgets = [
      {
        disasterId: disaster._id,
        category: "Food & Water",
        allocatedAmount: 50000,
        approvalStatus: "Approved",
        approvedBy: "Finance Officer",
        approvalDate: new Date(),
        createdBy: "seed-script",
        fiscalYear: "2023/2024"
      },
      {
        disasterId: disaster._id,
        category: "Medical Supplies",
        allocatedAmount: 75000,
        approvalStatus: "Approved",
        approvedBy: "Finance Officer",
        approvalDate: new Date(),
        createdBy: "seed-script",
        fiscalYear: "2023/2024"
      },
      {
        disasterId: disaster._id,
        category: "Shelter & Housing",
        allocatedAmount: 100000,
        approvalStatus: "Approved",
        approvedBy: "Finance Officer",
        approvalDate: new Date(),
        createdBy: "seed-script",
        fiscalYear: "2023/2024"
      },
      {
        disasterId: disaster._id,
        category: "Transportation",
        allocatedAmount: 40000,
        approvalStatus: "Pending",
        approvedBy: "Pending Review",
        approvalDate: new Date(),
        createdBy: "seed-script",
        fiscalYear: "2023/2024"
      }
    ];

    const createdBudgets = await BudgetAllocation.insertMany(budgets);
    console.log(`✅ Created ${createdBudgets.length} test budgets`);

    // Create test expenses
    const expenses = [
      {
        disasterId: disaster._id,
        category: "Food & Water",
        vendorName: "Maseru Supplies Ltd",
        vendorRegistrationNumber: "REG-001",
        invoiceNumber: "INV-2024-001",
        amount: 15000,
        status: "Approved",
        loggedBy: "seed-script",
        approvedBy: "Finance Officer",
        approvalDate: new Date(),
        supportingDocumentUrl: "https://example.com/invoice-001",
        paymentMethod: "Bank Transfer"
      },
      {
        disasterId: disaster._id,
        category: "Food & Water",
        vendorName: "Water Works Company",
        vendorRegistrationNumber: "REG-002",
        invoiceNumber: "INV-2024-002",
        amount: 12000,
        status: "Approved",
        loggedBy: "seed-script",
        approvedBy: "Finance Officer",
        approvalDate: new Date(),
        supportingDocumentUrl: "https://example.com/invoice-002",
        paymentMethod: "Bank Transfer"
      },
      {
        disasterId: disaster._id,
        category: "Medical Supplies",
        vendorName: "National Health Ministry",
        vendorRegistrationNumber: "REG-003",
        invoiceNumber: "INV-2024-003",
        amount: 35000,
        status: "Approved",
        loggedBy: "seed-script",
        approvedBy: "Finance Officer",
        approvalDate: new Date(),
        supportingDocumentUrl: "https://example.com/invoice-003",
        paymentMethod: "Bank Transfer"
      },
      {
        disasterId: disaster._id,
        category: "Shelter & Housing",
        vendorName: "Construction Materials Co",
        vendorRegistrationNumber: "REG-004",
        invoiceNumber: "INV-2024-004",
        amount: 45000,
        status: "Pending",
        loggedBy: "seed-script",
        approvedBy: null,
        approvalDate: null,
        supportingDocumentUrl: "https://example.com/invoice-004",
        paymentMethod: "Bank Transfer"
      },
      {
        disasterId: disaster._id,
        category: "Transportation",
        vendorName: "Transport Solutions",
        vendorRegistrationNumber: "REG-005",
        invoiceNumber: "INV-2024-005",
        amount: 18000,
        status: "Pending",
        loggedBy: "seed-script",
        approvedBy: null,
        approvalDate: null,
        supportingDocumentUrl: null,
        paymentMethod: "Bank Transfer"
      }
    ];

    const createdExpenses = await Expense.insertMany(expenses);
    console.log(`✅ Created ${createdExpenses.length} test expenses`);

    console.log("\n📊 Financial Data Summary:");
    console.log(`   Budget Allocations: ${createdBudgets.length}`);
    console.log(`   Total Budget: ₤${budgets.reduce((sum, b) => sum + b.allocatedAmount, 0).toLocaleString()}`);
    console.log(`   Expenses: ${createdExpenses.length}`);
    console.log(`   Total Spent: ₤${expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seedFinancialData();
