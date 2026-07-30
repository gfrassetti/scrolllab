/**
 * One-off: borra órdenes pending de un email (limpieza de pruebas MP).
 * Uso: node server/scripts/delete-pending-orders.js guidofrassetti@gmail.com
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { User, Order } from '../models.js'

const email = process.argv[2]
if (!email) {
  console.error('Uso: node server/scripts/delete-pending-orders.js <email>')
  process.exit(1)
}

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Falta MONGODB_URI')
  process.exit(1)
}

await mongoose.connect(uri)
const user = await User.findOne({ email: email.toLowerCase() })
if (!user) {
  console.error('Usuario no encontrado')
  await mongoose.disconnect()
  process.exit(1)
}

const result = await Order.deleteMany({
  userId: user._id,
  status: 'pending',
})
console.log(`Borradas ${result.deletedCount} órdenes pending de ${email}`)
await mongoose.disconnect()
