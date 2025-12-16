// cardManager.test.js
import { jest } from '@jest/globals'; // 显式导入 jest
import { getSrsTodayList, useCardSrs } from './cardManager.js';

// 使用 jest.fn() 模拟全局 fetch
global.fetch = jest.fn();

describe('SRS 前端 API 集成测试', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('getSrsTodayList 能够正确处理后端返回的清单', async () => {
    const mockData = {
      success: true,
      cards: [{ card_id: 'test_card', title: '测试', p_score: 10 }]
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const result = await getSrsTodayList('mod1');
    expect(result).toHaveLength(1);
    expect(result[0].card_id).toBe('test_card');
  });

  test('useCardSrs 应该发送正确的 POST 请求并返回新状态', async () => {
    const mockState = { success: true, new_state: { rc: 1, lad: '2025-12-16' } };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockState
    });

    const result = await useCardSrs('test_card', 'mod1');
    
    // 验证调用了正确的 URL 和方法
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/mod1/srs/use/test_card'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.newState.rc).toBe(1);
  });
});