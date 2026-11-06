import {test,expect} from '@playwright/test';
test('customer login explains MEMO passwords in all four languages and hides unapproved SSO',async({page})=>{
 await page.route('**/api/auth/providers',r=>r.fulfill({json:{google:false,mfu:false,studentEmail:false}}));
 await page.route('**/api/auth/pending-mfa',r=>r.fulfill({json:{data:[]}}));
 await page.goto('/login?lang=en');await expect(page.getByRole('button',{name:'Continue with Google'})).toBeDisabled();await expect(page.getByRole('button',{name:'Continue with MFU SSO'})).toHaveCount(0);await expect(page.getByText(/MEMO never asks for university passwords/)).toBeVisible();
 for(const locale of ['th','my','zh-CN','en']){await page.getByTestId('language-selector').selectOption(locale);await expect(page.locator('html')).toHaveAttribute('lang',locale);await expect(page.locator('.notice').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.getByRole('link',{name:'Forgot MEMO password',exact:true}).click();await expect(page).toHaveURL(/forgot-password/);await expect(page.getByRole('link',{name:'University account recovery (MFU)'})).toHaveAttribute('href','https://accounts.mfu.ac.th/Auth/');
});
test('password recovery and verification resend submit only the MEMO email and show generic outcomes',async({page})=>{
 const actions:string[]=[];await page.route('**/api/auth/customer',async r=>{const p=r.request().postDataJSON();expect(p.email).toBe('synthetic@example.com');expect(p.password).toBeUndefined();actions.push(p.action);await r.fulfill({json:{ok:true}});});
 await page.goto('/forgot-password?lang=en');await page.getByLabel('Email',{exact:true}).fill('synthetic@example.com');await page.getByRole('button',{name:'Forgot MEMO password',exact:true}).click();await expect(page.getByRole('status')).toContainText('If eligible');await page.getByRole('button',{name:'Resend verification email'}).click();await expect.poll(()=>actions).toEqual(['recover','resend']);
});
test('enrolled customer sees the authenticator step before completing sign-in',async({page})=>{
 await page.route('**/api/auth/providers',r=>r.fulfill({json:{google:true,mfu:false,studentEmail:false}}));await page.route('**/api/auth/pending-mfa',r=>r.fulfill({json:{data:[]}}));
 let verified=false;await page.route('**/api/auth',async r=>{const p=r.request().postDataJSON();if(p.action==='login'){await r.fulfill({json:{ok:true,mfaRequired:true,factors:[{id:'synthetic-factor'}]}});return;}expect(p.action).toBe('mfa-verify');expect(p.factorId).toBe('synthetic-factor');expect(p.code).toBe('123456');verified=true;await r.fulfill({json:{verified:true}});});
 await page.goto('/login?lang=en');await page.getByLabel('Email',{exact:true}).first().fill('synthetic@example.com');await page.getByLabel('Password (at least 12 characters)').fill('synthetic-memo-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByLabel('Verification code')).toBeVisible();expect(verified).toBe(false);await page.getByLabel('Verification code').fill('123456');await page.getByRole('button',{name:'Verify',exact:true}).click();await expect.poll(()=>verified).toBe(true);
});
