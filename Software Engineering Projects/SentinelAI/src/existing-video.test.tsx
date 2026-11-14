import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {ExistingVideo,TestVideos} from './pages/ExistingVideo';
import ExternalNotification from './pages/ExternalNotification';
import {api} from './api';
vi.mock('./api',()=>({api:vi.fn(),post:vi.fn()}));
beforeEach(()=>{URL.createObjectURL=vi.fn(()=> 'blob:local-preview');URL.revokeObjectURL=vi.fn();});
afterEach(()=>vi.resetAllMocks());

test('existing video picker does not force the camera and allows selecting the same file again',()=>{
 const choose=vi.fn();render(<ExistingVideo file={null} locked={false} choose={choose}/>);
 const input=screen.getByLabelText('Choose evidence video');
 expect(input).not.toHaveAttribute('capture');
 const file=new File(['fixture'],'test.mp4',{type:'video/mp4'});
 fireEvent.change(input,{target:{files:[file]}});fireEvent.change(input,{target:{files:[file]}});
 expect(choose).toHaveBeenCalledTimes(2);expect(choose).toHaveBeenCalledWith(file);
});
test('local preview warns about duration, supports removal, and releases its URL',()=>{
 const choose=vi.fn(),file=new File(['fixture'],'test.mp4');
 const {unmount}=render(<ExistingVideo file={file} locked={false} choose={choose}/>);
 const video=screen.getByLabelText('Selected video preview');
 Object.defineProperty(video,'duration',{value:130});fireEvent.loadedMetadata(video);
 expect(screen.getByText(/longer than 2 minutes/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Remove selected video'}));expect(choose).toHaveBeenCalledWith(null);
 unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-preview');
});
test('locked upload cannot be replaced or removed',()=>{
 const choose=vi.fn();render(<ExistingVideo file={new File(['fixture'],'test.mp4')} locked={true} choose={choose}/>);
 expect(screen.getByLabelText('Choose evidence video')).toBeDisabled();
 expect(screen.getByRole('button',{name:'Remove selected video'})).toBeDisabled();
 fireEvent.drop(screen.getByLabelText('Choose evidence video').closest('label')!,{dataTransfer:{files:[new File(['x'],'other.mp4')]}});
 expect(choose).not.toHaveBeenCalled();
});
test('fixture catalog is loaded on demand and recovers from a network error',async()=>{
 vi.mocked(api).mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({videos:[{id:'EN-01',title:'Fictional example',duration:8,bytes:1024}]});
 const {container}=render(<TestVideos/>);expect(api).not.toHaveBeenCalled();
 const details=container.querySelector('details')!;details.open=true;
 expect(await screen.findByText('Connection lost')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Retry'}));
 await waitFor(()=>expect(screen.getByRole('link',{name:/Fictional example/})).toHaveAttribute('href','/api/test-videos/EN-01'));
});
test('external provider button is withheld for a test recording',()=>{
 render(<ExternalNotification alert={{id:'test',test_recording:true,status:'open'}} delivery={{enabled:true}} onSent={vi.fn()}/>);
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
