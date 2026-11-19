import Skeleton from "react-loading-skeleton";

const TableSkeleton = () => (
  <>
    {[1, 2, 3, 4, 5].map((n) => (
      <tr key={n} className="border-b border-gray-50 last:border-0">
        <td className="px-6 py-5">
          <Skeleton width={20} height={20} />
        </td>
        <td className="px-6 py-5">
          <Skeleton width={80} height={16} />
        </td>
        <td className="px-6 py-5">
          <Skeleton width={100} height={16} />
        </td>
        <td className="px-6 py-5">
          <Skeleton width={60} height={16} />
        </td>
        <td className="px-6 py-5 text-center">
          <Skeleton width={80} height={24} borderRadius={6} />
        </td>
        <td className="px-6 py-5 text-center">
          <Skeleton width={80} height={24} borderRadius={6} />
        </td>
      </tr>
    ))}
  </>
);

export default TableSkeleton;
