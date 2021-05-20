import { Schema } from 'mongoose';

export const ArticleSchema = new Schema({
  created: {
    type: Date,
    default: Date.now,
  },
  title: {
    type: String,
    default: '',
    trim: true,
    required: 'Title cannot be blank',
  },
  content: {
    type: String,
    default: '',
    trim: true,
  },
});
