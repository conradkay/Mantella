import bcrypt from 'bcryptjs'
import { Schema, model, Model, Document } from 'mongoose'

export const UserSchema = new Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  username: { type: String, required: true },
  profileImg: String,
  projects: [{ type: Schema.Types.ObjectId, ref: 'Project', required: true }]
} as any)

export const getUserByEmail = async (email: string) => {
  return await UserModel.findOne({ email })
}

export const getUserById = async (id: string) => {
  return await UserModel.findById(id)
}

export const comparePassword = async (
  candidatePassword: string,
  hash: string
) => {
  return await bcrypt.compare(candidatePassword, hash)
}

export interface UserProps {
  email: string
  password: string
  username: string
  profileImg?: string
  projects: any
  id: string
}

export const UserModel: Model<Document & UserProps> = model(
  'User',
  UserSchema,
  'Users'
)
