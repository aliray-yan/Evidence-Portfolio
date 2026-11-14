import {act,renderHook} from '@testing-library/react';
import {afterEach,expect,test,vi} from 'vitest';
import {api} from './api';
import {useResource} from './components';

vi.mock('./api',()=>({api:vi.fn()}));
afterEach(()=>{vi.useRealTimers();vi.mocked(api).mockReset();Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});});

test('automatic refresh waits for requests and pauses in hidden tabs',async()=>{
 vi.useFakeTimers();let finish!:(value:unknown)=>void;
 vi.mocked(api).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({total:2});
 const {result,unmount}=renderHook(()=>useResource('/cases',10000));
 await act(async()=>{vi.advanceTimersByTime(30000);});
 expect(api).toHaveBeenCalledTimes(1);
 await act(async()=>{finish({total:1});});
 expect(result.current.data).toEqual({total:1});
 await act(async()=>{vi.advanceTimersByTime(10000);});
 expect(api).toHaveBeenCalledTimes(2);expect(result.current.data).toEqual({total:2});
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
 await act(async()=>{vi.advanceTimersByTime(20000);});
 expect(api).toHaveBeenCalledTimes(2);
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
 await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));});
 expect(api).toHaveBeenCalledTimes(3);
 unmount();await act(async()=>{vi.advanceTimersByTime(20000);});expect(api).toHaveBeenCalledTimes(3);
});

test('a late response from an old filter cannot replace current records',async()=>{
 let finish!:(value:unknown)=>void;
 vi.mocked(api).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({query:'new'});
 const {result,rerender,unmount}=renderHook(({path})=>useResource(path),{initialProps:{path:'/cases?q=old'}});
 await act(async()=>{rerender({path:'/cases?q=new'});});
 expect(result.current.data).toEqual({query:'new'});
 await act(async()=>{finish({query:'old'});});
 expect(result.current.data).toEqual({query:'new'});unmount();
});

test('a failed background update retains the last successful records',async()=>{
 vi.useFakeTimers();vi.mocked(api).mockResolvedValueOnce({total:4}).mockRejectedValueOnce(new Error('Connection interrupted'));
 const {result,unmount}=renderHook(()=>useResource('/cases',10000));
 await act(async()=>{});
 await act(async()=>{vi.advanceTimersByTime(10000);});
 expect(result.current.data).toEqual({total:4});expect(result.current.error).toBe('Connection interrupted');
 expect(result.current.updatedAt).not.toBeNull();unmount();
});
