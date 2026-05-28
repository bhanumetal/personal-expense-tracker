import mongoose, { Schema, Document, Model, Types } from "mongoose";

interface ICategorySummary {
  categoryId: Types.ObjectId;
  categoryName: string;
  total: number;
}

export interface IMonthlySummary extends Document {
  userId: Types.ObjectId;
  year: number;
  month: number;
  totalSpent: number;
  byCategory: ICategorySummary[];
  expenseCount: number;
  updatedAt: Date;
}

const CategorySummarySchema = new Schema<ICategorySummary>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    categoryName: { type: String, required: true },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const MonthlySummarySchema = new Schema<IMonthlySummary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    totalSpent: { type: Number, required: true, default: 0 },
    byCategory: { type: [CategorySummarySchema], default: [] },
    expenseCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

MonthlySummarySchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

const MonthlySummary: Model<IMonthlySummary> =
  mongoose.models.MonthlySummary ??
  mongoose.model<IMonthlySummary>("MonthlySummary", MonthlySummarySchema);

export default MonthlySummary;
