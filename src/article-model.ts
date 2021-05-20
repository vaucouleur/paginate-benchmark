import mongoose from 'mongoose';
import { ArticleSchema } from './article-schema';

export interface Article {
  created: Date;
  title: string;
  content: string;
}
export const ArticleModel = mongoose.model<Article>('Article', ArticleSchema);
