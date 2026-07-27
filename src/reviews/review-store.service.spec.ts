import { ConfigService } from '@nestjs/config';
import { ReviewStoreService } from './review-store.service';

describe('ReviewStoreService', () => {
  const createStore = (resultTtlMs = 86_400_000): ReviewStoreService =>
    new ReviewStoreService(new ConfigService({ review: { resultTtlMs } }));

  afterEach(() => jest.restoreAllMocks());

  it('returns a review before its configured expiration time', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const store = createStore(5_000);
    store.set('review-id', '<html></html>');
    now.mockReturnValue(5_999);
    expect(store.get('review-id')).toBe('<html></html>');
  });

  it('removes a review at its configured expiration time', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const store = createStore(5_000);
    store.set('review-id', '<html></html>');
    now.mockReturnValue(6_000);
    expect(store.get('review-id')).toBeUndefined();
    expect(store.get('review-id')).toBeUndefined();
  });
});
