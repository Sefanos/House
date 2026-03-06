type DmConversationPageProps = {
  params: {
    userId: string;
  };
};

export default function DmConversationPage({ params }: DmConversationPageProps) {
  return (
    <section>
      <h3>Conversation with user {params.userId}</h3>
      <p>Active DM conversation placeholder.</p>
    </section>
  );
}
