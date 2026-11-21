import {test,expect} from '@playwright/test';
const facebook='https://www.facebook.com/profile.php?id=61596250074649';
test('homepage contains only service, process, gallery and contact sections with the supplied logo',async({page})=>{
 await page.goto('/?lang=en');await expect(page.locator('.brochure-service')).toHaveCount(2);await expect(page.getByText('฿100',{exact:true})).toBeVisible();await expect(page.getByText('฿1,500',{exact:true})).toBeVisible();await expect(page.locator('.brochure-process li')).toHaveCount(3);await expect(page.locator('.brochure-gallery-card')).toHaveCount(6);await expect(page.locator('.marketplace,.market-empty,.market-search,.market-categories,.catalog-section')).toHaveCount(0);
 await expect(page.locator('.brochure-site a[href*="configure"],.brochure-site a[href*="login"],.brochure-site a[href*="models"]')).toHaveCount(0);
 const logo=page.locator('.brand .memo-logo');await expect(logo).toBeVisible();await expect.poll(()=>logo.evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth)).toBe(200);await expect(logo).toHaveAttribute('src','/brand/memo-logo.jpg');await expect(page.locator('#services')).toContainText('before production');
});
test('Facebook, telephone and section links are real and require no customer sign-in',async({page,isMobile})=>{
 await page.goto('/?lang=en');const contact=page.locator('#contact');await expect(contact.getByRole('link',{name:/Message on Facebook/})).toHaveAttribute('href',facebook);await expect(contact.getByRole('link',{name:/Call MEMO/})).toHaveAttribute('href','tel:+66943804586');await expect(contact).toContainText('094 380 4586');await expect(page.locator('.inline-auth')).toHaveCount(0);
 const links=page.locator(isMobile?'.mobile-menu nav':'.desktop-nav');if(isMobile)await page.locator('.mobile-menu summary').click();expect(await links.locator('a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')))).toEqual(['/#services','/#how-it-works','/#gallery','/#contact']);
 await page.goto('/models?lang=en');await expect(page).toHaveURL(/\/gallery$/);await expect(page.locator('.marketplace')).toHaveCount(0);await expect(page.locator('.brochure-gallery-card')).toHaveCount(6);
});
test('gallery loads actual licensed local images, shows attribution, and supports keyboard preview without checkout',async({page})=>{
 await page.goto('/gallery?lang=en');for(const card of await page.locator('.brochure-gallery-card').all()){await card.scrollIntoViewIfNeeded();await expect(card.locator('[data-image-state=loaded]')).toBeVisible();expect(await card.locator('img').evaluate((i:HTMLImageElement)=>i.complete&&i.naturalWidth>0)).toBe(true);await expect(card.locator('a[rel*=license]')).toHaveAttribute('href',/creativecommons.org/);}
 await expect(page.getByRole('heading',{name:'Everyday 3D prints'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Tape dispenser repair cores/})).toBeVisible();
 await expect(page.locator('.brochure-section-heading')).toContainText('not MEMO products or completed customer orders');const preview=page.locator('.brochure-image-button').first();await preview.focus();await expect(preview).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('dialog')).toBeVisible();await expect(page.locator('dialog [data-image-state=loaded]')).toBeVisible();await expect(page.locator('dialog .inspiration-credit')).toContainText('Sandstein');await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();await expect(preview).toBeFocused();await expect(page.locator('a[href*="/inspiration/"]')).toHaveCount(0);
});

test('button sounds play after activation and the mute preference survives reload',async({page,isMobile})=>{
 await page.addInitScript(()=>{
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){
   if(this.src.endsWith('/sounds/button-click.wav')){
    document.documentElement.dataset.soundStarts=String(Number(document.documentElement.dataset.soundStarts??0)+1);
    this.addEventListener('ended',()=>{document.documentElement.dataset.soundFinished='true';},{once:true});
   }
   return play.call(this);
  };
 });
 await page.goto('/gallery?lang=en');
 const preview=page.getByRole('button',{name:/Modular drawer organizer/});
 const toggle=page.getByRole('button',{name:'Button sounds'});
 await expect(toggle).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('html')).not.toHaveAttribute('data-sound-starts',/./);
 if(isMobile) await preview.tap();
 else await preview.press('Enter');
 await expect(page.locator('dialog')).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-sound-starts','1');
 await expect(page.locator('html')).toHaveAttribute('data-sound-finished','true');
 await page.keyboard.press('Escape');
 await toggle.click();
 await expect(toggle).toHaveAttribute('aria-pressed','false');
 await page.reload();
 await expect(toggle).toHaveAttribute('aria-pressed','false');
 await preview.click();
 await expect(page.locator('dialog')).toBeVisible();
 await expect(page.locator('html')).not.toHaveAttribute('data-sound-starts',/./);
});
test('dark is the customer default and all themes and languages fit desktop, tablet and mobile',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});
 await page.goto('/?lang=en');
 await expect(page.getByTestId('theme-selector')).toHaveValue('dark');
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(17, 21, 27)');
 await page.getByTestId('theme-selector').selectOption('light');
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(250, 250, 249)');
 await page.reload();
 await expect(page.getByTestId('theme-selector')).toHaveValue('light');
 for(const width of [1440,960,768,390,320]){await page.setViewportSize({width,height:1000});for(const locale of ['th','my','zh-CN','en']){await page.getByTestId('language-selector').selectOption(locale);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('.brochure-service').first()).toBeVisible();}}
 await page.getByTestId('theme-selector').selectOption('system');
 await page.emulateMedia({colorScheme:'light'});
 await page.reload();
 await expect(page.getByTestId('theme-selector')).toHaveValue('system');
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.emulateMedia({colorScheme:'dark'});
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('hero gives its frameless model room to scale and respects reduced motion',async({page,isMobile})=>{
 await page.goto('/?lang=en');
 const art=page.locator('.brochure-hero-art');
 const heroCopy=page.locator('.brochure-hero-copy');
 const revealItems=heroCopy.locator('.eyebrow,h1 span,.brochure-intro,.brochure-hero-actions a');
 await expect.poll(()=>revealItems.evaluateAll(items=>items.map(item=>getComputedStyle(item).animationDelay))).toEqual([
  '0s','0.11s','0.23s','0.35s','0.45s','0.52s',
 ]);
 await expect(heroCopy.locator('h1')).toHaveCSS('font-family',/^"Cabinet Grotesk"/);
 await expect(heroCopy.locator('.brochure-intro')).toHaveCSS('font-family',/^Satoshi/);
 const float=page.locator('.brochure-hero-float');
 const stage=page.locator('.brochure-hero-stage');
 await expect(float).toHaveCSS('animation-name','hero-float');
 await expect(float).toHaveCSS('animation-duration','6s');
 await expect(stage).toHaveCSS('perspective','1000px');
 await expect(stage).toHaveCSS('border-top-width','0px');
 await expect(art).toHaveCSS('border-top-width','0px');
 const bounds=(await stage.boundingBox())!;
 const copy=(await heroCopy.boundingBox())!;
 if(isMobile){
  const viewport=page.viewportSize()!;
  expect(bounds.width).toBeGreaterThan(viewport.width-60);
  expect(bounds.x+bounds.width/2).toBeCloseTo(viewport.width/2,0);
  expect(bounds.y).toBeGreaterThan(copy.y+copy.height);
 }else{
  expect(bounds.width).toBeGreaterThan(500);
  expect(bounds.x).toBeGreaterThan(copy.x+copy.width);
 }
 await expect(art).toHaveCSS('animation-name','memo-art-enter');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(art).toHaveCSS('animation-name','none');
 await expect(float).toHaveCSS('animation-name','none');
 await expect.poll(()=>revealItems.evaluateAll(items=>items.every(item=>{
  const style=getComputedStyle(item);
  return style.animationName==='none'&&style.opacity==='1';
 }))).toBe(true);
});

test('the homepage renders and rotates the figurine as a 3D model',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/?lang=en');
 const model=page.locator('.brochure-hero-model');
 await expect(model).toHaveAttribute('data-model-state','ready',{timeout:20000});
 const canvas=model.locator('canvas');
 await expect(canvas).toBeVisible();
 expect(await canvas.evaluate((el:HTMLCanvasElement)=>el.width/el.clientWidth)).toBeGreaterThanOrEqual(1.49);
 await expect(model.locator('img')).toHaveCount(0);
 await canvas.focus();
 await page.keyboard.press('Home');
 const front=await canvas.screenshot();
 await page.keyboard.press('ArrowRight');
 await expect.poll(async()=>(await canvas.screenshot()).equals(front)).toBe(false);
 await page.keyboard.press('Home');
 await expect.poll(async()=>(await canvas.screenshot()).equals(front)).toBe(true);
});

test('the hero shows the supplied figurine still if the 3D texture cannot load',async({page})=>{
 await page.route('**/brand/hero-figurine-hd-texture.jpg',route=>route.abort());
 await page.goto('/?lang=en');
 const model=page.locator('.brochure-hero-model');
 await expect(model).toHaveAttribute('data-model-state','unavailable',{timeout:20000});
 await expect.poll(()=>model.locator('img').evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBe(1080);
 await expect(model).toContainText('Still preview');
});
