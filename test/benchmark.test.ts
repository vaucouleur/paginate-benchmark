import {
  seed,
  connect,
  remove,
  close,
  totalArticlesToSeed,
  ArticleModel,
  start,
} from '../src/index';

describe('benchmark', () => {
  beforeEach(async () => {
    await connect();
    await remove();
  });

  afterEach(async () => {
    await remove();
    await close();
  });

  it('should seed', async () => {
    const all = async () => ArticleModel.find({}).exec();
    await seed();
    const after = await all();
    expect(after.length).toEqual(totalArticlesToSeed);
  }, 10000);

  it('should drop', async () => {
    const all = async () => ArticleModel.find({}).exec();
    await seed();
    await remove();
    await seed();
    const after = await all();
    expect(after.length).toEqual(totalArticlesToSeed);
  }, 10000);

  it('should run benchmarks', async () => {
    await start();
  }, 20000);
});
