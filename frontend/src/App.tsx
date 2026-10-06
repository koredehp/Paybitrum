import { useState, useEffect } from 'react'
import {
  useAccount, useConnect, useDisconnect, useSwitchChain,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi'
import { arbitrumSepolia } from 'wagmi/chains'
import { parseUnits, formatUnits, isAddress } from 'viem'
import { PAYBITRUM_ADDRESS, USDC_ADDRESS, paybitrumAbi, erc20Abi } from './contracts'
import EscrowManager from './EscrowManager'

function toUnits(value: string): bigint | null {
  try {
    const v = parseUnits(value, 6)
    return v > 0n ? v : null
  } catch {
    return null
  }
}

export default function App() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const [freelancer, setFreelancer] = useState('')
  const [amount, setAmount] = useState('100')
  const [days, setDays] = useState('3')

  const wrongNetwork = isConnected && chainId !== arbitrumSepolia.id
  const ready = isConnected && !wrongNetwork

  const balance = useReadContract({
    address: USDC_ADDRESS, abi: erc20Abi, functionName: 'balanceOf',
    args: address ? [address] : undefined, query: { enabled: ready },
  })
  const allowance = useReadContract({
    address: USDC_ADDRESS, abi: erc20Abi, functionName: 'allowance',
    args: address ? [address, PAYBITRUM_ADDRESS] : undefined, query: { enabled: ready },
  })
  const count = useReadContract({
    address: PAYBITRUM_ADDRESS, abi: paybitrumAbi, functionName: 'escrowCount',
    query: { enabled: ready },
  })

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (receipt.isSuccess) {
      balance.refetch()
      allowance.refetch()
      count.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess])

  const amountUnits = toUnits(amount)
  const daysNum = Number(days)
  const formOk = isAddress(freelancer) && amountUnits !== null && daysNum > 0
  const needsApproval = amountUnits !== null && (allowance.data ?? 0n) < amountUnits

  function mint() {
    if (!address) return
    reset()
    writeContract({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'mint',
      args: [address, parseUnits('1000', 6)],
    })
  }

  function approve() {
    if (amountUnits === null) return
    reset()
    writeContract({
      address: USDC_ADDRESS, abi: erc20Abi, functionName: 'approve',
      args: [PAYBITRUM_ADDRESS, amountUnits],
    })
  }

  function createEscrow() {
    if (!formOk || amountUnits === null) return
    reset()
    const deadline = BigInt(Math.floor(Date.now() / 1000) + daysNum * 86400)
    writeContract({
      address: PAYBITRUM_ADDRESS, abi: paybitrumAbi, functionName: 'createEscrow',
      args: [freelancer as `0x${string}`, USDC_ADDRESS, amountUnits, deadline],
    })
  }

  const busy = isPending || receipt.isLoading

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Paybitrum</h1>
      <p>Escrow payments for remote work, on Arbitrum.</p>

      {!isConnected && (
        <button onClick={() => connect({ connector: connectors[0] })}>Connect wallet</button>
      )}

      {isConnected && (
        <div>
          <p>Connected: {address}</p>
          {wrongNetwork ? (
            <div>
              <p>Wrong network. Please switch to Arbitrum Sepolia.</p>
              <button onClick={() => switchChain({ chainId: arbitrumSepolia.id })}>
                Switch to Arbitrum Sepolia
              </button>
            </div>
          ) : (
            <p>Network: Arbitrum Sepolia ✓</p>
          )}
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      )}

      {ready && (
        <div style={{ marginTop: 32 }}>
          <h2>1. Get test USDC</h2>
          <p>Your balance: {balance.data !== undefined ? formatUnits(balance.data, 6) : '...'} mUSDC</p>
          <button disabled={busy} onClick={mint}>Mint 1,000 test USDC</button>

          <h2 style={{ marginTop: 32 }}>2. Create an escrow</h2>
          <label>Freelancer address<br />
            <input style={{ width: '100%' }} value={freelancer} placeholder="0x..."
              onChange={(e) => setFreelancer(e.target.value)} />
          </label>
          <p />
          <label>Amount (mUSDC)<br />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <p />
          <label>Deadline (days from now)<br />
            <input value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          <p />
          {needsApproval ? (
            <button disabled={busy || !formOk} onClick={approve}>Step A: Approve USDC</button>
          ) : (
            <button disabled={busy || !formOk} onClick={createEscrow}>Step B: Create escrow</button>
          )}

          <p>Escrows created so far: {count.data?.toString() ?? '...'}</p>

          {isPending && <p>Confirm in your wallet...</p>}
          {receipt.isLoading && <p>Waiting for the transaction to confirm...</p>}
          {receipt.isSuccess && (
            <p>
              Done ✓ <a href={`https://sepolia.arbiscan.io/tx/${hash}`} target="_blank">View on Arbiscan</a>
            </p>
          )}
                    {error && <p style={{ color: 'crimson' }}>Error: {error.message.split('\n')[0]}</p>}
        </div>
      )}

      {ready && <EscrowManager />}
    </div>
  )
}