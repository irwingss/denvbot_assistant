import React from 'react';
import ReactMarkdown from 'react-markdown';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import OpenAiIcon from './openaiicon';
import classes from './message.module.css';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const renderLatex = (text) => {
    if (typeof text !== 'string') return text;
    
    // Procesamos primero las expresiones entre corchetes
    text = text.replace(/\[([^\[\]]*)\]/g, (match, p1) => {
        return `$${p1}$`; // Cambiamos a delimitadores de inline math ($)
    });
    
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/);
    return parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
            return <BlockMath key={index} math={part.slice(2, -2)} />;
        } else if (part.startsWith('$') && part.endsWith('$')) {
            return <InlineMath key={index} math={part.slice(1, -1)} />;
        } else {
            return part;
        }
    });
};

const renderContent = (content) => {
    if (typeof content === 'string') {
        return renderLatex(content);
    } else if (Array.isArray(content)) {
        return content.map((item, index) => <React.Fragment key={index}>{renderContent(item)}</React.Fragment>);
    } else if (React.isValidElement(content)) {
        return content;
    } else {
        return String(content);
    }
};

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
                            li: ({node, children, ...props}) => <li className={classes.listItem} {...props}>{renderContent(children)}</li>,
                            p: ({node, children, ...props}) => <p className={classes.paragraph} {...props}>{renderContent(children)}</p>,
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