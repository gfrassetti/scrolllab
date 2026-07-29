import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, index: true, sparse: true },
    email: { type: String, required: true, unique: true },
    name: String,
    avatar: String,
  },
  { timestamps: true },
)

const orderItemSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    title: String,
    unit_price: Number,
    currency_id: { type: String, default: 'ARS' },
    recipe: { type: [String], default: undefined },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      index: true,
    },
    items: [orderItemSchema],
    total: Number,
    currency_id: { type: String, default: 'ARS' },
    mpPreferenceId: String,
    mpPaymentId: { type: String, sparse: true, unique: true },
    downloadCount: { type: Number, default: 0 },
    zipPath: String,
    receiptEmailSendingAt: Date,
    receiptEmailSentAt: Date,
    receiptEmailId: String,
    receiptEmailError: String,
  },
  { timestamps: true },
)

export const User = mongoose.models.User || mongoose.model('User', userSchema)
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)
