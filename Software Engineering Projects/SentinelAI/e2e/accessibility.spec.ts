import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('main screens meet automated WCAG A/AA checks',async({page})=>{
 const results:any[]=[];
 async function check(name:string){
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   results.push(...result.violations.map(v=>({url:name,id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
 }
 await page.goto('/');
 await expect(page.getByLabel('Workspace role')).toBeVisible();await check('Sign in');
 await page.getByLabel('Workspace role').selectOption('demo-admin');
 await page.getByRole('button',{name:'Enter demonstration'}).click();
 await expect(page.getByRole('heading',{name:'Operations overview'})).toBeVisible();
 for(const [url,ready] of [['/','Recent cases'],['/cases','All cases'],['/capture','New evidence submission'],['/cases/SA-26-1042','Evidence player'],['/alerts','Safety & review alerts'],['/admin','Users & access'],['/health','Processing capabilities']]){
   await page.goto(url);await expect(page.getByRole('heading',{name:ready,exact:false})).toBeVisible();
   await expect(page.getByRole('status',{name:'Loading records'})).toHaveCount(0);
   await check(url);
 }
 for(const [url,ready] of [['/admin?tab=devices','Registered devices'],['/admin?tab=policies','Evidence retention & privacy'],['/admin?tab=models','Risk thresholds & fusion weights'],['/admin?tab=phrases','Phrase & slang library'],['/audit','Recorded events']]){
   await page.goto(url);await expect(page.getByRole('heading',{name:ready,exact:true})).toBeVisible();await expect(page.getByRole('status',{name:'Loading records'})).toHaveCount(0);await check(url);
 }
 await page.goto('/cases/SA-26-1042');await expect(page.getByRole('heading',{name:'Evidence player'})).toBeVisible();
 for(const name of ['Event timeline','Evidence summary','Case history']){await page.getByRole('tab',{name,exact:false}).click();await check(name);}
 await page.setViewportSize({width:390,height:844});await check('Mobile investigation');
 await test.info().attach('accessibility-findings',{body:JSON.stringify(results,null,2),contentType:'application/json'});
 expect(results).toEqual([]);
});
