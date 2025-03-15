
import React from 'react';
import OrangeBall3DGame from "@/components/OrangeBall3DGame";
import { Helmet } from 'react-helmet';

const Index = () => {
  return (
    <>
      <Helmet>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" />
      </Helmet>
      <div className="h-screen w-screen overflow-hidden">
        <OrangeBall3DGame />
      </div>
    </>
  );
};

export default Index;
