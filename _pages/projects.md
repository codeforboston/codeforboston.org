---
layout: page
title: Projects
type: hidden
permalink: /projects/
---

{: .t-section-headline }
#Code for Boston Projects

Formally sponsored Code for Boston initiatives, these projects have a great deal of Code for Boston resources devoted to them and are held to a higher standard of documentation and maintenance. These projects are not synced to a specific team lead. Brigade-sponsored projects will be presented at each Hack Night and will be available for those in attendance to contribute. A Code for Boston Leadership Team member will serve as de facto project lead in the absence of another lead. These projects are well-documented and maintained and have in-depth `readme.md` files so that anyone wishing to contribute can do so.


In addition to our [prototyping lab](/prototyping-lab/), we have a few ongoing projects which we treat more as products than experiments. These projects have substantial buy-in from their respective audiences, adhere to our open-source documentation standards, and are build with scalability (geographically, to other cities) in mind.

##Current Active Projects
{% for project in site.data.projects.active %}
  [{{project.name}}]({{project.url}})
{% endfor %}


<iframe src="https://docs.google.com/a/codeforboston.org/forms/d/1QosuVBXWVUH8vRHZChauOXRvPFQhwrn3vi0dDcZd80Y/viewform?embedded=true" width="100%" height="1200px" frameborder="0" marginheight="0" marginwidth="0">Loading...</iframe>
