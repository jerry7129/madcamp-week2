export default function DeleteProjectModal({ userId, ids, onClose }: { userId: number, ids: Set<number>, onClose: () => void }) {
  
  const handleDeletion = async () => {
    try {
      // 1. 모든 삭제 요청(Promise)을 배열로 만듭니다. (Set을 Array로 변환하여 map 사용)
      const deletePromises = Array.from(ids).map(id =>
        fetch((process.env.NEXT_PUBLIC_SERVER_URI || '') + `/api/projects/${id}?userId=${userId}`, {
          method: 'DELETE'
        })
      );

      // 2. 서버의 응답을 모두 기다립니다.
      const responses = await Promise.all(deletePromises);

      // 3. 응답 상태가 정상(200~299)이 아닌 것이 하나라도 있는지 검사합니다.
      const failedResponses = responses.filter(res => !res.ok);
      
      if (failedResponses.length > 0) {
        // 실패한 경우 에러를 던져 catch 블록으로 보냅니다.
        throw new Error(`서버에서 ${failedResponses.length}개의 삭제를 거절했습니다.`);
      }

      // 4. 모두 정상적으로 삭제되었다면 모달을 닫습니다.
      onClose();
      
    } catch (err) {
      console.error("Delete Action Error:", err);
      alert('삭제가 진행되지 않았습니다. 서버 상태를 확인하거나 다시 시도하세요.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-black rounded-xl shadow-lg dark:shadow-zinc-500/50 overflow-hidden">
        <div className="p-4">
          <p className="font-bold mb-2">선택한 {ids.size}개의 프로젝트를 삭제하시겠습니까?</p>
          <p className="text-gray-600 dark:text-gray-400">삭제된 프로젝트는 복구할 수 없습니다.</p>
          <div className="flex flex-row text-sm gap-2">
            <button
              className="mt-4 px-4 py-2 grow bg-gray-100 active:bg-gray-200 text-black dark:text-white rounded-md dark:bg-zinc-800 dark:active:bg-zinc-900"
              onClick={onClose}
            >
              취소
            </button>
            <button
              className="mt-4 px-4 py-2 grow bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-md"
              onClick={handleDeletion}
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
