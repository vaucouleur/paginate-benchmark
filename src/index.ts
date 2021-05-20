import mongoose, { ConnectOptions } from 'mongoose';
import { ArticleModel, Article } from './article-model';
import pretty from 'pretty-time';

export const totalArticlesToSeed = 10000;
export const totalArticlesToQuery = 10000;
export const pageIndex = 250; // zero based index for use with Mongoose's .skip() method
export const take = 20;

const uri = 'mongodb://localhost/paginate-benchmark';

export { ArticleModel };

interface BenchmarkResult {
  name: string;
  elapsed: number[];
  withCache: boolean;
}

export const connect = async () => {
  const options: ConnectOptions = {
    user: '',
    pass: '',
    useUnifiedTopology: true,
    useNewUrlParser: true,
  };
  return mongoose.connect(uri, options);
};

export const close = async () => {
  return mongoose.connection.close();
};

export const remove = async () => {
  try {
    const collections = await mongoose.connection.db.collections();
    for (let i = 0; i < collections.length; i++) {
      const coll = collections[i];
      if (coll.namespace === 'paginate-benchmark.articles') {
        await coll.drop();
      }
    }
  } catch (e) {
    console.error(e);
  }
};

export const seed = async () => {
  const articles: Article[] = [];
  for (var i = 0; i < totalArticlesToSeed; i++) {
    articles.push({
      created: new Date(),
      title: 'Dummy title ' + i,
      content: '1234567890 1234567890 1234567890 1234567890 1234567890',
    });
  }
  return await ArticleModel.insertMany(articles);
};

const doTiming = async (
  name: string,
  withCache: boolean,
  f: Strategy
): Promise<BenchmarkResult> => {
  await remove();
  await seed();
  if (withCache) {
    await f();
  }
  const start = process.hrtime();
  for (let i = 0; i < 10; i++) {
    await f();
  }
  const elapsed = process.hrtime(start);
  await remove();
  return { name, elapsed, withCache };
};

export type Strategy = () => Promise<Article[]>;

export const strategy1 = async (): Promise<Article[]> => {
  return ArticleModel.find({})
    .skip(pageIndex * take)
    .limit(take)
    .exec();
};

export const strategy2 = async (): Promise<Article[]> => {
  const query = ArticleModel.find({}).limit(totalArticlesToQuery);
  await query.count();
  return query
    .skip(pageIndex * take)
    .limit(take)
    .exec();
};

export const strategy3 = async (): Promise<Article[]> => {
  const query = ArticleModel.find({})
    .limit(totalArticlesToQuery)
    .sort('_id');
  await query.count().exec();
  return query
    .skip(pageIndex * take)
    .limit(take)
    .exec();
};

const benchmark = async (withCache: boolean): Promise<BenchmarkResult[]> => {
  return [
    await doTiming('strategy 1', withCache, strategy1),
    await doTiming('strategy 2', withCache, strategy2),
    await doTiming('strategy 3', withCache, strategy3),
  ];
};

const report = async (results: BenchmarkResult[]) => {
  results.forEach(result => {
    const withCache = result.withCache ? ' (with cache)' : '';
    console.log(`${result.name}${withCache}: ${pretty(result.elapsed)}`);
  });
};

export const start = async () => {
  await report([...(await benchmark(false)), ...(await benchmark(true))]);
};
