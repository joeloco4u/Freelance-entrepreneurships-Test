import Skeleton from "react-loading-skeleton";

const SystemUsersSkeleton = () => (
  <tr className="border-b border-gray-50">
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        {/* Avatar Circle */}
        <Skeleton circle width={40} height={40} />
        <div className="flex-1">
          {/* Name and Email lines */}
          <Skeleton width={110} height={12} className="mb-1" />
          <Skeleton width={160} height={10} />
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      {/* Department badge */}
      <Skeleton width={96} height={18} borderRadius={8} />
    </td>
    <td className="px-6 py-4">
      {/* Roles badges */}
      <div className="flex gap-2">
        <Skeleton width={50} height={20} borderRadius={6} />
        <Skeleton width={50} height={20} borderRadius={6} />
      </div>
    </td>
    <td className="px-6 py-4">
      {/* Status badge */}
      <Skeleton width={64} height={20} borderRadius={6} />
    </td>
    <td className="px-6 py-4 text-right">
      {/* Actions buttons */}
      <div className="flex justify-end gap-2">
        <Skeleton width={32} height={32} borderRadius={8} />
        <Skeleton width={32} height={32} borderRadius={8} />
      </div>
    </td>
  </tr>
);

export default SystemUsersSkeleton;
