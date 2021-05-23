import axios from "axios";
import { next } from "cheerio/lib/api/traversing";
import { isArray } from "lodash";
import moment from "moment";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, Form } from "react-bootstrap";
import DataGrid, { Column, HeaderRendererProps } from "react-data-grid";
import { IStory } from "../../model/Story";

interface Filter extends Omit<IStory, "_id"> {}

// Context is needed to read filter values otherwise columns are
// re-created when filters are changed and filter loses focus
const FilterContext = createContext<Filter | undefined>(undefined);

const StoryDataGrid = () => {
  const [nextPage, setNextPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<IStory[]>([]);
  const [filters, setFilters] = useState<Filter>({
    storyText: "",
    channelId: "",
    userId: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await axios.get("/story", {
        params: { limit: 50, page: nextPage },
      });

      if (isArray(data.docs)) setRows([...rows, ...data.docs]);

      if (data.hasNextPage) setNextPage(data.nextPage);
      else setLoading(false);
    })();
  }, [nextPage]);

  const columns = useMemo(
    (): readonly Column<IStory>[] => [
      {
        key: "storyText",
        name: "Story",
        width: 500,
        resizable: true,
        headerCellClass: "filter-cell",
        headerRenderer: ({ column }) => {
          const filter_context = useContext(FilterContext)!;
          return (
            <div className="p-1">
              <div>{column.name}</div>
              <Form.Control
                size="sm"
                value={filter_context.storyText}
                type="input"
                onChange={(e) =>
                  setFilters({
                    ...filter_context,
                    storyText: e.currentTarget.value,
                  })
                }
              />
            </div>
          );
        },
      },
      {
        key: "votes",
        name: "votes",
        resizable: true,
        formatter: ({ row }) => (
          <>{(row.votes || []).map((v) => v.value).join(", ")}</>
        ),
      },
      {
        key: "createdAt",
        name: "Date",
        resizable: true,
        formatter: ({ row }) => <>{moment(row.createdAt).calendar()}</>,
      },
      {
        key: "channelId",
        name: "Channel",
        resizable: true,
      },
    ],
    []
  );

  const filteredRows = useMemo(
    () =>
      rows
        .filter((r) => new RegExp(filters.storyText, "i").test(r.storyText))
        .sort((a, b) => moment(b.createdAt).diff(a.createdAt)),
    [rows, filters]
  );

  return (
    <div className="mt-2 flex-column flex-grow-1 d-flex">
      {loading && <Alert variant="warning">Loading data...</Alert>}
      <FilterContext.Provider value={filters}>
        <DataGrid
          className="flex-grow-1"
          columns={columns}
          rows={filteredRows}
          headerRowHeight={85}
          summaryRowHeight={10}
        />
      </FilterContext.Provider>
    </div>
  );
};

export default StoryDataGrid;
