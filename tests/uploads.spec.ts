import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const accounts=JSON.parse(readFileSync('../work/verification/accounts.json','utf8'));
const env=Object.fromEntries(readFileSync('.env.local','utf8').trim().split('\n').map(l=>l.split('=')));
const api=()=>createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
test('image OCR, text and scanned PDF, XLSX read locally; profile is editable',async({page,context})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/app');await page.getByLabel('Email',{exact:true}).fill(accounts[0].email);await page.getByLabel('Password',{exact:true}).fill(accounts[0].password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'Edit profile',exact:true}).click();await page.getByLabel('Your name').fill('QA Student');await page.getByLabel('University').fill('My own university');await page.getByLabel('Major / field of study').fill('Fine arts');await page.getByRole('button',{name:'Save profile'}).click();await expect(page.getByText('My own university · Fine arts')).toBeVisible();
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Classes',exact:true}).click();
 const fixture=await context.newPage();await fixture.setViewportSize({width:1200,height:300});await fixture.setContent('<html><body style="font-family:Arial;font-size:32px;padding:40px;background:white;color:black">ART201 Visual Culture Monday 09:00 - 10:30</body></html>');const png=await fixture.screenshot();const pdf=await fixture.pdf();await fixture.setContent(`<html><body><img style="width:100%" src="data:image/png;base64,${png.toString('base64')}"/></body></html>`);const scan=await fixture.pdf();await fixture.close();
 const inputs=[{name:'timetable.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:readFileSync('tests/fixtures/timetable.xlsx')},{name:'timetable.pdf',mimeType:'application/pdf',buffer:pdf},{name:'timetable.png',mimeType:'image/png',buffer:png},{name:'scanned.pdf',mimeType:'application/pdf',buffer:scan}];
 for(const file of inputs){await page.getByRole('button',{name:'Upload timetable',exact:true}).first().click();await page.getByLabel('Timetable files').setInputFiles(file);await expect(page.getByLabel('Course code 1')).toHaveValue('ART201',{timeout:90000});await expect(page.getByLabel('Day 1')).toHaveValue('1');await expect(page.getByLabel('Start 1')).toHaveValue('09:00');await expect(page.getByRole('button',{name:'Import 1 courses',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Cancel',exact:true}).click();}
 expect(errors).toEqual([]);
});
test('import is atomic, cannot target another user, and rejects duplicate courses',async()=>{
 const a=api(),b=api();await a.auth.signInWithPassword(accounts[0]);await b.auth.signInWithPassword(accounts[1]);const {data:sem,error}=await a.from('semesters').insert({name:'QA atomic import'}).select().single();expect(error).toBeNull();
 const good={code:'BIO201',name:'Biology',credits:3,priority:2,meetings:[{day:1,start_time:'09:00',end_time:'10:00',type:'Lecture',room:''}]};
 try{expect((await a.rpc('import_timetable',{sid:sem.id,items:[good,{...good,code:'BAD201',credits:-1}]})).error).not.toBeNull();expect((await a.from('courses').select().eq('semester_id',sem.id)).data).toEqual([]);
 expect((await b.rpc('import_timetable',{sid:sem.id,items:[good]})).error).not.toBeNull();expect((await a.rpc('import_timetable',{sid:sem.id,items:[good]})).error).toBeNull();expect((await a.rpc('import_timetable',{sid:sem.id,items:[good]})).error).not.toBeNull();expect((await a.from('courses').select().eq('semester_id',sem.id)).data).toHaveLength(1);
 const conflict={...good,code:'BIO202'};expect((await a.rpc('import_timetable',{sid:sem.id,items:[conflict]})).error).not.toBeNull();expect((await a.rpc('import_timetable',{sid:sem.id,items:[conflict],allow_conflicts:true})).error).toBeNull();
 }finally{await a.from('semesters').delete().eq('id',sem.id);}
});
