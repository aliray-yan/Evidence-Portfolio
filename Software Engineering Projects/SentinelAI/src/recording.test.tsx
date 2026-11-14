import {expect,test} from 'vitest';
import {recordedFile} from './recording';
test('an empty camera result cannot be presented as ready or uploaded',()=>{
 expect(()=>recordedFile([],'video/webm')).toThrow('empty recording');
 expect(()=>recordedFile([new Blob([])],'video/webm')).toThrow('empty recording');
});
test('recording chunks are kept in order with the chosen container',async()=>{
 const result=recordedFile([new Blob(['a'.repeat(20)]),new Blob(['b'.repeat(25)])],'video/mp4');
 expect(result.size).toBe(45);expect(result.name).toMatch(/\.mp4$/);expect(result.type).toBe('video/mp4');
});
