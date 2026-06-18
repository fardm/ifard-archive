---
{}
---

```base
formulas:
  ratingstar: |
    if(rating == 5, "★★★★★",
    if(rating == 4.5, "★★★★⯨",
    if(rating == 4, "★★★★",
    if(rating == 3.5, "★★★⯨",
    if(rating == 3, "★★★",
    if(rating == 2.5, "★★⯨",
    if(rating == 2, "★★",
    if(rating == 1.5, "★⯨",
    if(rating == 1, "★",
    ""
    )))))))))
properties:
  formula.ratingstar:
    displayName: starRating
views:
  - type: cards
    name: 📚 Books
    filters:
      and:
        - file.hasTag("Book")
    order:
      - file.name
      - badge
      - pages
      - formula.starRating
    sort:
      - property: date
        direction: DESC
      - property: rating
        direction: DESC
    image: note.cover
    cardSize: 180
    imageAspectRatio: 1.5
    imageFit: ""
  - type: cards
    name: 🎬 Movie
    filters:
      and:
        - file.hasTag("Movie")
    groupBy:
      property: type
      direction: ASC
    order:
      - file.name
      - badge
      - formula.starRating
    sort:
      - property: date
        direction: DESC
    image: note.cover
    cardSize: 180
    imageAspectRatio: 0.7
    imageFit: ""
  - type: cards
    name: 🎙Podcasts
    filters:
      and:
        - file.tags.contains("podcast")
        - date >= "2025-03-21"
        - date <= "2026-03-20"
    order:
      - file.name
      - badge
      - formula.ratingstar
    image: note.cover
    cardSize: 150
    imageAspectRatio: 1
  - type: cards
    name: 🎓Courses
    filters:
      and:
        - file.tags.contains("course")
        - date >= "2025-03-21"
        - date <= "2026-03-20"
    order:
      - file.name
      - badge
      - formula.ratingstar
    image: note.cover
    cardSize: 150
    imageAspectRatio: 0.6

```
