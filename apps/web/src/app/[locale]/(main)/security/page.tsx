import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@zenncore/web/components/table";
import { getMessages } from "next-intl/server";
import { MarketingPage, marketingMetadata } from "@/components/marketing/page";

export const generateMetadata = async () => {
  const { enterpriseCompany } = await getMessages();
  return marketingMetadata(enterpriseCompany.security.meta, "/security");
};

export default async () => {
  const { enterpriseCompany } = await getMessages();
  const content = enterpriseCompany.security;
  const { subprocessors } = content;
  const hasLocations = subprocessors.rows.some((processor) =>
    processor.location.trim(),
  );

  return (
    <MarketingPage
      content={content}
      path="/security"
      sectionChildren={{
        "sub-processors": (
          <div className="overflow-x-auto px-4 md:px-8">
            <Table className="table-fixed border-b-0 text-left">
              <TableCaption className="text-left">
                {subprocessors.caption}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  {subprocessors.headers.map(
                    (heading, index) =>
                      (index !== 2 || hasLocations) && (
                        <TableHead
                          key={heading}
                          className={
                            index === 0
                              ? "w-1/4 whitespace-normal"
                              : "whitespace-normal"
                          }
                        >
                          {heading}
                        </TableHead>
                      ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {subprocessors.rows.map((processor) => (
                  <TableRow key={processor.name}>
                    <TableHead
                      scope="row"
                      className="whitespace-normal align-top font-medium"
                    >
                      {processor.name}
                    </TableHead>
                    <TableCell className="whitespace-normal align-top">
                      {processor.purpose}
                    </TableCell>
                    {hasLocations && (
                      <TableCell className="whitespace-normal align-top">
                        {processor.location}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ),
      }}
    />
  );
};
