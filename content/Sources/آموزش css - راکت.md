---
author:
length: 11 hour 30 min
rating: 4
status: 🟩 Done
date: 2024-09-03T00:00:00.000Z
link:
  - https://roocket.ir/series/learn-css
cover: "[[aamwzsh-css-rakt.webp]]"
tags:
  - Course
cover_source: https://s32.picofile.com/file/8478837334/css.jpg
---

# خلاصه
## بخش دوم: مقدمات

**انواع روش های استایل دهی**
1. خاصیت style درون خطی
2. تگ `<style>` داخلی
3. تعریف یک فایل CSS و لینک دهی به فایل HTML به این شکل مثلا:
   `<link rel="stylesheet" href="./style.css">`


**کامنت گذاری**
با کلید میانبر `Ctrl + /`



**سایت های بررسی پشتیبانی مرورگر از css**
https://developer.mozilla.org/
https://caniuse.com/

---

## بخش سوم: سلکتور

### کلاس های ترکیبی
میشه چند کلاس رو برای یه تگ تعریف کرد. فقط کافیه بین کلاس ها اسپیس بزنید.
`<div class="class-1 class-2 class-3">`


### سلکتور وابسته و چندسطحی

#### وابستگی class به class دیگر
با این روش استایل مد نظر فقط روی المان هایی اعمال میشن که مثلا هر دو class-1 و class-2 رو با هم داشته باشند. بنابراین اگر اگر المانی فقط کلاس1 رو داشته باشه یا فقط کلاس 2 رو داشته باشه اون استایل روش اعمال نمیشه.
مثلا این تگ مد نظر ماست:
```html
<div class="test-1"></div>

<div class="test-2"></div>

<div class="test-1 test-2"></div>
```

کافیه کلاس ها رو بدون اسپیس وارد کنیم به این شکل:
```css
.test-1.test-2 {
    background-color: red;
}
```

الان این استایل فقط روی تگ سوم در کد html ما اعمال میشه.


#### وابستگی class به id
...

#### وابستگی class به تگ
فرض کنید این کد ماست:
```html
<p class="test"> Lorem ipsum </p>

<div class="test">lorem ipsom</div>
```

میخوایم استایل مد نظر فقط روی تگ div اعمال بشه و روی تگ p اعمال نشه. از این استفاده میکنیم:
```css
div.test {
    background-color: blue;
}
```


#### والد و فرزند

### انتخاب‌کننده‌های Attribute

سرچ کردن داخل پراپرتی: از ابتدا  `*`، از انتها `$`

### عملگرهای انتخاب‌کننده
`>` : فرزند
`+` : اولین برادر 
`~` : همه برادرها

### شبه کلاس‌ها و المنت‌ها

[Pseudo-classes](https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes)
[Pseudo-elements](https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements)


---

## بخش چهارم: باکس مدل


---

## بخش پنجم: بک گراند و تصویر

---
## بخش ششم: فونت و متن

---


## بخش هفتم: واحدها وسایزها
دو نوع واحد داریم: 
مطلق: Absolute
نسبی: Relative
[CSS values and units](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units)

فرق em وrem: [لینک](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units#ems_and_rems)

 استفاده از واحدها:
 تگ ریشه: %
 تگ های والد: rem
 تگ های فرزند: em
 مارجین و پدینگ: rem
 بوردر: px
 طول و عرض: %
 
---

## بخش هشتم: موقعیت المنت‌ها

**فرق div - span :** 
در اسپن display=init
در دیو display=block

**فلکس گرو**

**فکلس بایسیز**



# حاشیه

توی ویژوال استدیو کد میشه موارد مشابه رو با هم انتخاب کرد. 
با Ctrl + D مورد مشابه بعدی سلکت میشه
با Ctrl + Shift + L همه موارد مشابه سلکت میشه.
