type RoomPageProps = {
  params: {
    houseId: string;
    roomId: string;
  };
};

export default function RoomPage({ params }: RoomPageProps) {
  return (
    <section>
      <h4>
        House {params.houseId} / Room {params.roomId}
      </h4>
      <p>Chat or voice room placeholder view.</p>
    </section>
  );
}
