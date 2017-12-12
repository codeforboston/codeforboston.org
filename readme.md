# Code For Boston Website

This is a pretty standard [Jekyll](https://jekyllrb.com/) website at http://www.codeforboston.org/; there are a number of datasets in `_data` that build various lists displayed on the site.

We have a [Guide for New Members](http://www.codeforboston.org/new-members/).  Please be sure to read our [Code of Conduct](http://www.codeforboston.org/code-of-conduct/).  CFB is a [Code for America Brigade](http://www.codeforamerica.org/brigade/about).

## First time? Download some dependencies.
This repository makes use of [reveal.js](https://github.com/hakimel/reveal.js). In order to synchronize the dependencies within this repository, run the following:
```bash
git submodule update --init
```

## I want to update the wesite. How do I do that?
- To add/update jobs, edit `_data/jobs.yml`
- To add/update events, edit [`_data/events/active.yml`](https://github.com/codeforboston/CFB_static/edit/master/_data/events/active.yml)
- To edit normal site pages, edit the `html` or `markdown` files in `_pages/`
- To edit the homepage content, edit `index.html`

## Deploy to codeforboston.org
This site is hosted via [GitHub Pages](https://pages.github.com/), so all you need to do to deploy is to push updates to the `master` branch in GitHub. Within minutes, http://www.codeforboston.org/ will reflect the new changes.
