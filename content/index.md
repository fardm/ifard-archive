---
title: آرشیو
description: آرشیو شخصی من
cssclasses:
  - bases-hide-meta
  - nowarp2
  - card-s
comments: false
publish: true
created: 2025-01-01
draft: false
---


> [!grid4]
> <!-- QueryToSerialize: TABLE WITHOUT ID "📚" as icon, length(rows) + " جلد کتاب" as count, "`" + sum(rows.pages) + " صفحه`" as sum FROM #Book WHERE file.name !="New Book" GROUP BY "" -->
> <!-- SerializedQuery: TABLE WITHOUT ID "📚" as icon, length(rows) + " جلد کتاب" as count, "`" + sum(rows.pages) + " صفحه`" as sum FROM #Book WHERE file.name !="New Book" GROUP BY "" -->
>
> | icon | count        | sum          |
> | ---- | ------------ | ------------ |
> | 📚   | 125 جلد کتاب | `26608 صفحه` |
>
> <!-- SerializedQuery END -->
> <!-- QueryToSerialize: TABLE WITHOUT ID "🎙" as icon, length(rows) + " پادکست" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Podcast WHERE length !=null GROUP BY "" -->
> <!-- SerializedQuery: TABLE WITHOUT ID "🎙" as icon, length(rows) + " پادکست" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Podcast WHERE length !=null GROUP BY "" -->
> | icon | count     | sum        |
> | ---- | --------- | ---------- |
> | 🎙   | 94 پادکست | `239 ساعت` |
> 
> <!-- SerializedQuery END -->
> 
> <!-- QueryToSerialize: TABLE WITHOUT ID "🎬" as icon, length(rows) + " فیلم" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "film" AND length != null GROUP BY "" -->
> <!-- SerializedQuery: TABLE WITHOUT ID "🎬" as icon, length(rows) + " فیلم" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "film" AND length != null GROUP BY "" -->
> 
> | icon | count    | sum        |
> | ---- | -------- | ---------- |
> | 🎬   | 201 فیلم | `432 ساعت` |
>
> <!-- SerializedQuery END -->
> 
> <!-- QueryToSerialize: TABLE WITHOUT ID "📺" as icon, length(rows) + " سریال" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "series" AND length != null GROUP BY "" -->
> <!-- SerializedQuery: TABLE WITHOUT ID "📺" as icon, length(rows) + " سریال" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "series" AND length != null GROUP BY "" -->
> 
> | icon | count    | sum          |
> | ---- | -------- | ------------ |
> | 📺   | 35 سریال | `782.6 ساعت` |
> 
> <!-- SerializedQuery END -->
> 
> 
> <!-- QueryToSerialize: TABLE WITHOUT ID "🎈" as icon, length(rows) + " انیمیشن" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "animation" AND length != null GROUP BY "" -->
> <!-- SerializedQuery: TABLE WITHOUT ID "🎈" as icon, length(rows) + " انیمیشن" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "animation" AND length != null GROUP BY "" -->
>
> | icon | count      | sum         |
> | ---- | ---------- | ----------- |
> | 🎈   | 28 انیمیشن | `45.5 ساعت` |
>
> <!-- SerializedQuery END -->
> 
> <!-- QueryToSerialize: TABLE WITHOUT ID "⌛" as icon, length(rows) + " فیلم کوتاه" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "short" AND length != null GROUP BY "" -->
> <!-- SerializedQuery: TABLE WITHOUT ID "⌛" as icon, length(rows) + " فیلم کوتاه" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "short" AND length != null GROUP BY "" -->
> 
> | icon | count         | sum         |
> | ---- | ------------- | ----------- |
> | ⌛    | 60 فیلم کوتاه | `10.1 ساعت` |
> <!-- SerializedQuery END -->
> 
> <!-- QueryToSerialize: TABLE WITHOUT ID "🎭" as icon, length(rows) + " تئاتر" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "theatre" AND length != null GROUP BY "" -->
> <!-- SerializedQuery: TABLE WITHOUT ID "🎭" as icon, length(rows) + " تئاتر" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "theatre" AND length != null GROUP BY "" -->
>
> | icon | count   | sum        |
> | ---- | ------- | ---------- |
> | 🎭   | 2 تئاتر | `4.6 ساعت` |
>
> <!-- SerializedQuery END -->
> 
> <!-- QueryToSerialize: TABLE WITHOUT ID "🎥" as icon, length(rows) + " مستند" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "documentary" AND length !=null GROUP BY "" -->
> <!-- SerializedQuery: TABLE WITHOUT ID "🎥" as icon, length(rows) + " مستند" as count, "`" + round(sum(rows.length.hours),1) + " ساعت`" as sum FROM #Movie WHERE type = "documentary" AND length !=null GROUP BY "" -->
> 
> | icon | count    | sum         |
> | ---- | -------- | ----------- |
> | 🎥   | 38 مستند | `56.5 ساعت` |
> 
> <!-- SerializedQuery END -->





<br>


<center>
	<a href="./all.base" class="all-notes-btn">
		Card View
		  <svg viewBox="0 0 24 24" fill="none">
		    <path d="M19 12H5M5 12L11 6M5 12L11 18"
		      stroke="currentColor"
		      stroke-width="2"
		      stroke-linecap="round"
		      stroke-linejoin="round"/>
		  </svg>
	</a>
</center>



<style>
.card-s tr {
padding: 0.5em;
}
</style>

