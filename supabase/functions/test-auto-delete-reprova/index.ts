// Dummy de prova: será publicada e depois removida para comprovar o
// delete automático de edge functions no caminho push.
Deno.serve(() => new Response("reprova-delete-ok", { status: 200 }))
