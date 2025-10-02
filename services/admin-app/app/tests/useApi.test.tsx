import { act, renderHook } from '@testing-library/react';
import useApi from '../src/hooks/useApi';

describe('useApi hook', () => {
  it('returns data and clears loading state on success', async () => {
    const { result } = renderHook(() => useApi());

    let response: string | null = null;

    await act(async () => {
      response = await result.current.executeRequest(async () => 'ok');
    });

    expect(response).toBe('ok');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('captures network errors when response is missing', async () => {
    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.executeRequest(async () => {
        throw { message: 'Network down' };
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Network error - please check your connection');
  });

  it('captures API errors when response is present', async () => {
    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.executeRequest(async () => {
        throw {
          response: {
            status: 500,
            data: { error: 'Internal error' }
          }
        };
      });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe('Internal error');
    expect(result.current.error?.code).toBe('HTTP_500');
  });

  it('preserves ApiError instances and allows clearing the error', async () => {
    const { result } = renderHook(() => useApi());

    await act(async () => {
      await result.current.executeRequest(async () => {
        throw {
          response: {
            status: 404,
            data: { message: 'Not found' }
          }
        };
      });
    });

    const ApiErrorCtor = result.current.error?.constructor as (new (...args: any[]) => Error) | undefined;
    expect(ApiErrorCtor).toBeDefined();

    await act(async () => {
      await result.current.executeRequest(async () => {
        throw new ApiErrorCtor!('Already handled', 'PREVIOUS', 400);
      });
    });

    expect(result.current.error?.message).toBe('Already handled');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
