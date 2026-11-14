import {renderHook,act} from '@testing-library/react';
import {test,expect,vi,afterEach} from 'vitest';
import {useWebInactivity} from './useWebInactivity';
afterEach(()=>vi.useRealTimers());
test('only grants initial two minute grace and resets fifteen seconds on activity',()=>{
 vi.useFakeTimers();const onClose=vi.fn(),frameRef={current:{contentWindow:window,addEventListener(){},removeEventListener(){}}};
 const {result,unmount}=renderHook(()=>useWebInactivity({enabled:true,sessionId:'test',frameRef,origin:'https://game.test',onClose}));
 act(()=>vi.advanceTimersByTime(120000));expect(result.current).toBe(15);
 act(()=>vi.advanceTimersByTime(10000));expect(result.current).toBe(5);
 act(()=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:'https://game.test',data:{type:'playloot:activity'}})));
 expect(result.current).toBe(15);
 act(()=>vi.advanceTimersByTime(14999));expect(onClose).not.toHaveBeenCalled();
 act(()=>vi.advanceTimersByTime(251));expect(onClose).toHaveBeenCalledTimes(1);unmount();
});
