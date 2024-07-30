import React from 'react';
import ReactMarkdown from 'react-markdown';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import OpenAiIcon from './openaiicon';
import classes from './message.module.css';

export default function Message({ message, isWaiting }) {
    const classAvatar = message.role === 'user' ? `${classes.avatar} ${classes.order2}` : classes.avatar;
    const classText = message.role === 'user' ? `${classes.text} ${classes.order1}` : `${classes.text} ${classes.assistant}`;
    const classMessage = message.role === 'user' ? `${classes.message} ${classes.right}` : classes.message;
    
    return (
        <div className={classMessage}>
            {message.role !== 'user' && (
                <div className={classAvatar}>
                    <Avatar>
                        <OpenAiIcon color='#fff' />
                    </Avatar>
                </div>
            )}
            <div className={classText}>
                <div className={classes.content}>
                    <ReactMarkdown
                        components={{
                            ol: ({node, ...props}) => <ol className={classes.orderedList} {...props} />,
                            ul: ({node, ...props}) => <ul className={classes.unorderedList} {...props} />,
                            li: ({node, ...props}) => <li className={classes.listItem} {...props} />,
                            p: ({node, ...props}) => <p className={classes.paragraph} {...props} />
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>
                {isWaiting && (
                    <div className={classes.progress}>
                        <LinearProgress />
                    </div>
                )}
            </div>
        </div>
    );
}