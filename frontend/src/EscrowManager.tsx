import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { keccak256, toBytes, formatUnits } from 'viem'
import { PAYBITRUM_ADDRESS, paybitrumAbi } from './contracts'

const STATUS_NAMES = ['None', 'Funded', 'Submitted', 'Released', 'Refunded']

export default function EscrowManager() {
  const { address } = useAccount()
  const [idInput, setIdInput] = useState('1')
  const [workNote, setWorkNote] = useState('')

  const id = (() => { try { return BigInt(idInput) } catch { return undefined } })()

  const escrow = useReadContract({
    address: PAYBITRUM_ADDRESS, abi: paybitrumAbi, functionName: 'escrows',
    args: id !== undefined ? [id] : undefined, query: { enabled: id !== undefined },
  })

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (receipt.isSuccess) escrow.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess])

  if (!escrow.data) {
    return (
      <div style={{ marginTop: 32 }}>
        <h2>3. Manage an escrow</h2>
        <label>Escrow ID<br />
          <input value={idInput} onChange={(e) => setIdInput(e.target.value)} />
        </label>
        <p>{escrow.isFetching ? 'Loading...' : 'No escrow found with that ID.'}</p>
      </div>
    )
  }

  const [client, freelancer, , amount, deadline, submittedAt, , status] = escrow.data
  const statusName = STATUS_NAMES[status] ?? 'Unknown'
  const isClient = address?.toLowerCase() === client.toLowerCase()
  const isFreelancer = address?.toLowerCase() === freelancer.toLowerCase()
  const now = BigInt(Math.floor(Date.now() / 1000))
  const deadlinePassed = now > deadline
  const reviewOver = status === 2 && now > submittedAt + 7n * 86400n
  const busy = isPending || receipt.isLoading

  function run(fn: 'submitWork' | 'release' | 'refund' | 'claimAfterReview') {
    if (id === undefined) return
    reset()
    if (fn === 'submitWork') {
      const hash = keccak256(toBytes(workNote || 'work delivered'))
      writeContract({ address: PAYBITRUM_ADDRESS, abi: paybitrumAbi, functionName: 'submitWork', args: [id, hash] })
    } else {
      writeContract({ address: PAYBITRUM_ADDRESS, abi: paybitrumAbi, functionName: fn, args: [id] })
    }
  }

  return (
    <div style={{ marginTop: 32 }}>
      <h2>3. Manage an escrow</h2>
      <label>Escrow ID<br />
        <input value={idInput} onChange={(e) => setIdInput(e.target.value)} />
      </label>

      <p style={{ marginTop: 16 }}>
        Client: {client}<br />
        Freelancer: {freelancer}<br />
        Amount: {formatUnits(amount, 6)} mUSDC<br />
        Status: <strong>{statusName}</strong><br />
        Deadline: {new Date(Number(deadline) * 1000).toLocaleString()}
      </p>

      {!isClient && !isFreelancer && <p>This wallet is neither the client nor the freelancer for this escrow.</p>}

      {isFreelancer && status === 1 && !deadlinePassed && (
        <div>
          <label>Work note (hashed, not stored on-chain)<br />
            <input style={{ width: '100%' }} value={workNote} onChange={(e) => setWorkNote(e.target.value)} />
          </label>
          <p />
          <button disabled={busy} onClick={() => run('submitWork')}>Submit work</button>
        </div>
      )}

      {isClient && (status === 1 || status === 2) && (
        <button disabled={busy} onClick={() => run('release')} style={{ marginRight: 8 }}>
          Release payment
        </button>
      )}

      {isClient && status === 1 && deadlinePassed && (
        <button disabled={busy} onClick={() => run('refund')}>Refund me</button>
      )}

      {isFreelancer && status === 2 && reviewOver && (
        <button disabled={busy} onClick={() => run('claimAfterReview')}>Claim payment (review period over)</button>
      )}

      {isPending && <p>Confirm in your wallet...</p>}
      {receipt.isLoading && <p>Waiting for confirmation...</p>}
      {receipt.isSuccess && (
        <p>Done ✓ <a href={`https://sepolia.arbiscan.io/tx/${hash}`} target="_blank">View on Arbiscan</a></p>
      )}
      {error && <p style={{ color: 'crimson' }}>Error: {error.message.split('\n')[0]}</p>}
    </div>
    
  )
}