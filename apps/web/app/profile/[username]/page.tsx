type ProfilePageProps = {
  params: {
    username: string;
  };
};

export default function ProfilePage({ params }: ProfilePageProps) {
  return (
    <main style={{ padding: 24 }}>
      <h1>Profile: {params.username}</h1>
      <p>Public profile placeholder.</p>
    </main>
  );
}
