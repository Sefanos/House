type HouseLandingPageProps = {
  params: {
    houseId: string;
  };
};

export default function HouseLandingPage({ params }: HouseLandingPageProps) {
  return (
    <section>
      <h3>House landing for {params.houseId}</h3>
      <p>House welcome screen placeholder.</p>
    </section>
  );
}
