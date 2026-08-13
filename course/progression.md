# Course progression

Start each exercise from your own fork. The tutorials build on the same
repository so branches, issues, pull requests, and CI remain visible throughout
the course.

The annotated `course-v1/starter` tag marks the verified baseline. To restart
without deleting work:

```bash
git fetch --tags upstream
git switch -c tutorial-restart course-v1/starter
```

GitHub template-generated repositories start with a new commit and do not
inherit the source tag. In that case, the generated repository's first `main`
commit is the equivalent baseline.

Do not force-push or reset a shared branch as part of an exercise. Create a new
branch from the checkpoint instead.
