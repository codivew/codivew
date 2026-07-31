import { scheduleUpdateNotification, type UpdateNotifierFactory } from './update-notification.js';

describe('scheduleUpdateNotification', () => {
  it('하루 간격으로 latest 버전을 확인하고 종료 시 안내하도록 예약한다', async () => {
    const notify = jest.fn();
    const createNotifier = jest.fn(() => ({ notify })) as UpdateNotifierFactory;

    await scheduleUpdateNotification({ name: 'codivew', version: '0.1.0' }, createNotifier);

    expect(createNotifier).toHaveBeenCalledWith({
      pkg: { name: 'codivew', version: '0.1.0' },
      distTag: 'latest',
      updateCheckInterval: 24 * 60 * 60 * 1000,
    });
    expect(notify).toHaveBeenCalledWith({
      defer: true,
      message: [
        'Codivew 새 버전이 있습니다: {currentVersion} → {latestVersion}',
        '업데이트: npm install -g {packageName}@latest',
      ].join('\n'),
    });
  });

  it('업데이트 확인 초기화가 실패해도 예외를 전파하지 않는다', async () => {
    const createNotifier = (): never => {
      throw new Error('registry unavailable');
    };

    await expect(
      scheduleUpdateNotification({ name: 'codivew', version: '0.1.0' }, createNotifier),
    ).resolves.toBeUndefined();
  });

  it('알림 예약이 실패해도 예외를 전파하지 않는다', async () => {
    const createNotifier = (): ReturnType<UpdateNotifierFactory> => ({
      notify: (): void => {
        throw new Error('config unavailable');
      },
    });

    await expect(
      scheduleUpdateNotification({ name: 'codivew', version: '0.1.0' }, createNotifier),
    ).resolves.toBeUndefined();
  });
});
