import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IExpense extends Document {
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  amount: number;
  currency: string;
  description?: string;
  date: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, categoryId: 1 });

const Expense: Model<IExpense> =
  mongoose.models.Expense ?? mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;
