import MainLayout from "../../layouts/MainLayout";
import { PageBody } from "../../components/common/MasterPage";
import DocketEnquirySearch from "../../components/common/DocketEnquirySearch";

export default function DocketEnquiry() {
  return (
    <MainLayout>
      <PageBody title="Docket Enquiry">
        <DocketEnquirySearch showForm />
      </PageBody>
    </MainLayout>
  );
}
