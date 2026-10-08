<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep browser recognition and speech synthesis in a lifecycle-managed hook; cancel microphone and playback on persona/channel changes and unmount.
- Select speech from approved answer/safety text without transformations; other outcomes speak only their decision message, never stale or conflicting evidence.
- Compose member chat from AI Elements and reuse compact outcome cards; fixtures remain the single answer source across channels.
