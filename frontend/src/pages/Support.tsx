import PageContainer from "../components/pagecontainer";
import Card from "../components/card";

const Support = () => {
  return (
    <PageContainer title="Support Center" subtitle="Get fast help with reservations, EV sessions, and platform access.">
      <section className="grid two">
        <Card>
          <h3>Contact Team</h3>
          <p>Email: support@smartparking.com</p>
          <p>Phone: +91 44 1234 5678</p>
          <p>Response time: within 30 minutes during service hours.</p>
        </Card>

        <Card>
          <h3>Service Window</h3>
          <p>Mon - Fri: 7:00 AM to 10:00 PM</p>
          <p>Sat - Sun: 8:00 AM to 8:00 PM</p>
          <p>Emergency desk remains active 24x7 for payment or safety issues.</p>
        </Card>
      </section>
    </PageContainer>
  );
};

export default Support;
