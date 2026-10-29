import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe,it,expect,vi } from 'vitest';
import { CaseTable, Empty, ErrorPanel, Pagination, RiskBadge, Status } from './components';
import { errorText } from './api';

describe('Evidence UI',()=>{
 it('uses words as well as color for urgent risk',()=>{render(<RiskBadge label="Emergency" score={85}/>);expect(screen.getByText('Emergency')).toBeVisible();expect(screen.getByText('85')).toBeVisible();});
 it('does not invent a score for missing analysis',()=>{render(<RiskBadge label="Unassessed" score={null}/>);expect(screen.getByText('Unassessed')).toBeVisible();expect(screen.queryByText('0')).not.toBeInTheDocument();});
 it('retains useful case and provenance links',()=>{render(<MemoryRouter><CaseTable cases={[{id:'SA-TEST',title:'Routine procedure',risk_label:'Normal',risk_score:0,synthetic:true,status:'awaiting_review',location:'Lahore',created_at:'2026-10-20T12:00:00Z'} as any]}/></MemoryRouter>);expect(screen.getByRole('link',{name:'Routine procedure'})).toHaveAttribute('href','/cases/SA-TEST');expect(screen.getByText('Synthetic')).toBeVisible();});
 it('paginates only within the available records',()=>{const change=vi.fn();render(<Pagination page={1} size={10} total={12} onChange={change}/>);expect(screen.getByRole('button',{name:'Previous page'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Next page'}));expect(change).toHaveBeenCalledWith(2);});
 it('disables the next page at the end',()=>{render(<Pagination page={2} size={10} total={12} onChange={()=>{}}/>);expect(screen.getByRole('button',{name:'Next page'})).toBeDisabled();});
 it('offers an actionable retry',()=>{const retry=vi.fn();render(<ErrorPanel message="Connection lost" retry={retry}/>);expect(screen.getByRole('alert')).toHaveTextContent('Connection lost');fireEvent.click(screen.getByRole('button',{name:'Retry'}));expect(retry).toHaveBeenCalledOnce();});
 it('explains an empty result',()=>{render(<Empty title="No matching cases">Try another filter.</Empty>);expect(screen.getByText('Try another filter.')).toBeVisible();});
 it('presents processing statuses in readable language',()=>{render(<Status value="evidence_requested"/>);expect(screen.getByText('Evidence requested')).toBeVisible();});
 it('presents backend validation in actionable form',()=>{expect(errorText({detail:[{loc:['body','reason'],msg:'Must contain at least 10 characters'}]})).toContain('reason: Must contain');});
});
