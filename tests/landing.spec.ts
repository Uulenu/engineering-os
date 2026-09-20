import {test,expect} from '@playwright/test';
test('homepage explains the product, scroll stages, accessible signup, responsive layouts',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByRole('heading',{name:'Less chaos. More campus.'})).toBeVisible();
 await page.screenshot({path:'../work/verification/suralta-home-desktop.png'});
 await page.locator('#story-1').scrollIntoViewIfNeeded();await expect(page.locator('.story-card h3')).toHaveText('See the whole picture.');
 await page.locator('#story-2').scrollIntoViewIfNeeded();await expect(page.locator('.story-card h3')).toHaveText('Make time for progress.');
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'../work/verification/suralta-home-mobile.png'});await page.getByRole('link',{name:'Create your space'}).click();await expect(page.getByRole('heading',{name:'Create account',exact:true})).toBeVisible();await expect(page.getByLabel('University',{exact:false})).toBeVisible();await page.getByLabel('University',{exact:false}).fill('My own college');await page.getByLabel('Major / field of study').fill('Literature');await page.screenshot({path:'../work/verification/suralta-signup-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('.static-story')).toBeVisible();expect(errors).toEqual([]);
});
