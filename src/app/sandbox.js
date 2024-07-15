'use client'

import * as React from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import ClearIcon from '@mui/icons-material/Clear'
import SendIcon from '@mui/icons-material/Send'
import ResetIcon from '@mui/icons-material/RestartAlt'
import Message from '@/components/message'
import classes from './sandbox.module.css'
import { useAppStore } from '@/store/appstore'
import { SimpleId } from '@/lib/utils'
import Image from 'next/image'

export default function Sandbox() {

    const threadId = useAppStore((state) => state.threadId)
    const setThreadId = useAppStore((state) => state.setThreadId)

    const timRef = React.useRef(null)
    const messageRef = React.useRef(null)
    //const inputRef = React.useRef(null)

    const [messageItems, setMessageItems] = React.useState([])
    const [inputText, setInputText] = React.useState('')
    const [isLoading, setLoading] = React.useState(false)
    const [isMounted, setMounted] = React.useState(false)
    const [isWaiting, setWaiting] = React.useState(false)
    const [isComposing, setComposing] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        if (isMounted) {
            if (threadId) {
                deleteThread(threadId)
                setThreadId('')
            }
        }
    }, [isMounted])

    const deleteThread = async (thread_id) => {
        try {
            const response = await fetch('/api/thread', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ thread_id })
            })

            const result = await response.json()
            console.log(result)

        } catch (e) {
            console.log(e.message)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        setLoading(true)

        const text = inputText

        const message = {
            id: SimpleId(),
            role: 'user',
            createdAt: Date.now(),
            content: text,
        }

        setMessageItems((prev) => [...prev, message])
        setInputText('')
        resetScroll()

        try {
            const response = await fetch('/api/stream', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    message: text,
                    thread_id: threadId,
                    file_ids: ['vs_wN9lgC9jn6PcT4fWBDvLoKUS'],
                    tools: ['file_search']
                })
            })

            const reader = response.body.getReader()

            const assistantId = SimpleId()

            const assistant_message = {
                id: assistantId,
                role: 'assistant',
                createdAt: Date.now(),
                content: '',
            }

            setMessageItems((prev) => [...prev, assistant_message])
            setWaiting(true)
            resetScroll()

            let is_completed = false
            let thread_id = threadId

            while (!is_completed) {
                const { done, value } = await reader.read()
                if (done) {
                    is_completed = true
                    break
                }

                const raw_delta = new TextDecoder().decode(value)

                try {
                    const delta = JSON.parse(raw_delta)
                    if (delta.thread_id) {
                        thread_id = delta.thread_id
                    } else if (delta.wait) {
                        setWaiting(true)
                        resetScroll()
                    } else if (delta.longwait) {
                        setMessageItems((prev) => {
                            return prev.map((a) => {
                                return {
                                    ...a,
                                    content: a.id !== assistantId ? a.content : a.content + '\n\n'
                                }
                            })
                        })
                        setWaiting(true)
                        resetScroll()
                    } else if (delta.message && delta.role === 'assistant') {
                        setWaiting(false)
                        setMessageItems((prev) => {
                            return prev.map((a) => {
                                return {
                                    ...a,
                                    content: a.id !== assistantId ? a.content : delta.message
                                }
                            })
                        })
                        resetScroll()
                    }
                } catch (e) {
                    console.log('Error parsing JSON:', e.message)
                }
            }

            setWaiting(false)
            setThreadId(thread_id)
            resetScroll()

        } catch (e) {
            console.log(e.message)
        } finally {
            setLoading(false)
        }
    }

    const resetScroll = () => {
        clearTimeout(resetScroll)
        timRef.current = setTimeout(() => {
            messageRef.current.scrollTop = messageRef.current.scrollHeight
        }, 100)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (!isComposing) {
                handleSubmit(e)
            }
        }
    }

    const handleStartComposition = () => {
        setComposing(true)
    }

    const handleEndComposition = () => {
        setComposing(false)
    }

    const handleReset = () => {
        deleteThread(threadId)
        setThreadId('')
        setMessageItems([])
    }

    return (
        <div className={classes.container}>
            <div className={classes.header}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Image
                        src="/logo_denvbot_largo3.png"
                        alt="DenvBot Logo"
                        width={220}
                        height={45}
                        style={{ marginRight: '8px' }}
                    />
                </div>
                <IconButton onClick={handleReset}>
                    <ResetIcon />
                </IconButton>
            </div>
            <div className={classes.messages} ref={messageRef}>
                {
                    messageItems.map((msg, index) => {
                        return (
                            <Message key={msg.id} message={msg} isWaiting={index === messageItems.length - 1 && isWaiting} />
                        )
                    })
                }
            </div>
            <div className={classes.input}>
                <Box
                    component='form'
                    onSubmit={handleSubmit}
                    noValidate
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: 'white', // Borde blanco
                            },
                            '&:hover fieldset': {
                                borderColor: '#5f43fa', // Borde blanco en hover
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: '#5f43fa', // Borde neón amarillo cuando está enfocado
                                boxShadow: '0 0 4px 2px #5f43fa', // Sombra neón amarilla
                            },
                        },
                    }}
                >
                    <TextField
                        className={classes.inputText}
                        disabled={isLoading}
                        fullWidth
                        multiline
                        maxRows={3}
                        inputRef={(input) => input && input.focus()}
                        value={inputText}
                        placeholder='Escribe tu consulta'
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onCompositionStart={handleStartComposition}
                        onCompositionEnd={handleEndComposition}
                        autoFocus
                        sx={{
                            '& .MuiInputBase-input': {
                                color: '#fff', // Cambia este color al que desees
                                fontWeight: 300
                            },
                        }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position='end'>
                                    <IconButton
                                        onClick={() => setInputText('')}
                                        disabled={!inputText || isLoading}
                                    >
                                        <ClearIcon fontSize='inherit' style={{ color: 'white' }} />
                                    </IconButton>
                                    <IconButton
                                        onClick={(e) => handleSubmit(e)}
                                        disabled={!inputText || isLoading}
                                    >
                                        <SendIcon fontSize='inherit' style={{ color: 'white' }} />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>
            </div>
        </div>
    )
}
