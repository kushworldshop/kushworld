export default function PolicyContent({ body }: { body: string }) {
  const blocks = body.split('\n\n').filter(Boolean);

  return (
    <>
      {blocks.map((block, index) => {
        if (block.startsWith('## ')) {
          return (
            <h2 key={index} className="text-xl font-bold text-white mt-8">
              {block.slice(3)}
            </h2>
          );
        }
        return (
          <p key={index} className="text-zinc-300 leading-relaxed">
            {block}
          </p>
        );
      })}
    </>
  );
}