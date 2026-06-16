# Publishing this repository

No GitHub MCP connector was available in this session, so the repo is delivered
as files. To publish it (and obtain the citable URL referenced in the article):

```bash
cd seea-ai
git init && git add . && git commit -m "SEEA-AI reproducible accounting pipeline"
git branch -M main
# create an empty repo named seea-ai under your org/user first, then:
git remote add origin https://github.com/ivilaruic/SEEA_AI.git
git push -u origin main
```

The manuscript references `https://github.com/ivilaruic/SEEA_AI`. If you
publish under a different owner, update that single URL in:
- the manuscript (Sección 3.11 and 3.15)
- `README.md`

For a citable DOI, archive a release on Zenodo (https://zenodo.org) and add the
DOI badge to README.
