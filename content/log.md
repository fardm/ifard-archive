

```base
summaries:
  📚: ""
  total pages: values.reduce(acc + value, 0)
views:
  - type: table
    name: Books
    filters:
      and:
        - file.hasTag("Book")
        - edition == "Graded Reader"
    order:
      - pages
      - file.name
      - file.tags
    sort:
      - property: file.name
        direction: DESC
      - property: pages
        direction: DESC
    summaries:
      pages: total pages
      file.name: Filled
      file.tags: 📚
    columnSize:
      note.pages: 182

```


```base
summaries:
  🎬: ""
  sum lenth: |-
    values
      .filter(value.isTruthy())
      .reduce(
        acc + if(
          value.contains("h"),
          number(value.split("h")[0].trim()) * 60 +
          number(value.split("h")[1].replace("m", "").trim()),
          number(value.replace("min", "").replace("m", "").trim())
        ),
        0
      )
views:
  - type: table
    name: Movies
    filters:
      and:
        - file.hasTag("Movie")
        - type.contains("film")
    order:
      - length
      - file.name
      - file.tags
    sort:
      - property: length
        direction: DESC
    summaries:
      pages: Sum
      file.name: Filled
      file.tags: 🎬
      length: sum lenth

```



<style>
	tbody{
		display: none;
	}
</style>